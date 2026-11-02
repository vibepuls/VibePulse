# Blender 3.6+/4.x background script.
# Builds a stylized, fully weighted humanoid armature and walk/run/idle FBX sources.
# Usage:
# blender --background --python Scripts/build_character_rig_blender.py -- --output ../ContentSource/Characters/Player
import bpy, math, os, sys
from mathutils import Vector

def arg_value(flag, default):
    argv = sys.argv[sys.argv.index("--")+1:] if "--" in sys.argv else []
    return argv[argv.index(flag)+1] if flag in argv else default

OUT = os.path.abspath(arg_value("--output", os.path.join(os.path.dirname(__file__), "../ContentSource/Characters/Player")))
os.makedirs(OUT, exist_ok=True)

bpy.ops.object.select_all(action="SELECT"); bpy.ops.object.delete(use_global=False)
for datablocks in (bpy.data.meshes, bpy.data.curves, bpy.data.armatures, bpy.data.actions, bpy.data.materials):
    for block in list(datablocks):
        if block.users == 0: datablocks.remove(block)

# Unreal-friendly, humanoid bone names. Coordinates: X forward, Y lateral, Z up.
bones = {
 "root": ((0,0,0),(0,0,8),None),
 "pelvis": ((0,0,88),(0,0,101),"root"),
 "spine_01": ((0,0,101),(0,0,119),"pelvis"),
 "spine_02": ((0,0,119),(0,0,139),"spine_01"),
 "neck": ((0,0,139),(0,0,149),"spine_02"),
 "head": ((0,0,149),(0,0,174),"neck"),
 "clavicle_l": ((0,0,135),(0,15,135),"spine_02"),
 "upperarm_l": ((0,15,135),(0,29,115),"clavicle_l"),
 "lowerarm_l": ((0,29,115),(0,31,94),"upperarm_l"),
 "hand_l": ((0,31,94),(2,32,86),"lowerarm_l"),
 "clavicle_r": ((0,0,135),(0,-15,135),"spine_02"),
 "upperarm_r": ((0,-15,135),(0,-29,115),"clavicle_r"),
 "lowerarm_r": ((0,-29,115),(0,-31,94),"upperarm_r"),
 "hand_r": ((0,-31,94),(2,-32,86),"lowerarm_r"),
 "thigh_l": ((0,10,94),(0,10,53),"pelvis"),
 "calf_l": ((0,10,53),(0,10,12),"thigh_l"),
 "foot_l": ((7,10,10),(20,10,6),"calf_l"),
 "toe_l": ((20,10,6),(27,10,6),"foot_l"),
 "thigh_r": ((0,-10,94),(0,-10,53),"pelvis"),
 "calf_r": ((0,-10,53),(0,-10,12),"thigh_r"),
 "foot_r": ((7,-10,10),(20,-10,6),"calf_r"),
 "toe_r": ((20,-10,6),(27,-10,6),"foot_r"),
 # Non-deforming IK targets and pole vectors for two-bone solvers.
 "ik_foot_root": ((0,0,0),(0,0,4),"root"),
 "ik_foot_l": ((20,10,6),(20,10,10),"ik_foot_root"),
 "ik_foot_r": ((20,-10,6),(20,-10,10),"ik_foot_root"),
 "ik_hand_l": ((2,32,88),(2,32,92),"root"),
 "ik_hand_r": ((2,-32,88),(2,-32,92),"root"),
 "ik_knee_pole_l": ((0,48,52),(0,48,56),"root"),
 "ik_knee_pole_r": ((0,-48,52),(0,-48,56),"root"),
 "ik_elbow_pole_l": ((0,55,115),(0,55,119),"root"),
 "ik_elbow_pole_r": ((0,-55,115),(0,-55,119),"root"),
}
# Finger chains: three segments for four fingers and two for each thumb.
for side,sgn in (("l",1),("r",-1)):
    finger_specs=[
        ("thumb", -4.0, 5.0, 2, 2.0),
        ("index", -2.0, 7.0, 3, 1.5),
        ("middle", 0.0, 8.0, 3, 1.5),
        ("ring", 2.0, 7.0, 3, 1.5),
        ("pinky", 4.0, 5.5, 3, 1.5),
    ]
    for digit,yoff,length,segments,radius in finger_specs:
        parent="hand_"+side
        start=Vector((4.0,32.0*sgn+yoff,88.0))
        for seg in range(1,segments+1):
            end=start+Vector((length/segments, (1.0 if digit=="thumb" else 0.0)*sgn, 0.0))
            bone_name=f"{digit}_{side}_{seg:02d}"
            bones[bone_name]=(tuple(start),tuple(end),parent)
            start=end
            parent=bone_name

arm_data=bpy.data.armatures.new("SK_DhakaHuman_Skeleton")
arm=bpy.data.objects.new("SK_DhakaHuman_Armature",arm_data); bpy.context.collection.objects.link(arm)
bpy.context.view_layer.objects.active=arm; arm.select_set(True)
bpy.ops.object.mode_set(mode="EDIT")
for name,(head,tail,parent) in bones.items():
    b=arm_data.edit_bones.new(name); b.head=head; b.tail=tail
    if parent: b.parent=arm_data.edit_bones.get(parent)
bpy.ops.object.mode_set(mode="OBJECT"); arm.select_set(False)
arm.show_in_front=True; arm_data.display_type="OCTAHEDRAL"

def material(name, color, rough=.72):
    m=bpy.data.materials.new(name); m.diffuse_color=(*color,1); m.use_nodes=True
    bs=m.node_tree.nodes.get("Principled BSDF")
    if bs: bs.inputs["Base Color"].default_value=(*color,1); bs.inputs["Roughness"].default_value=rough
    return m
mats=[
 material("M_Dhaka_Shirt",(0.035,0.12,0.42)),
 material("M_Dhaka_Skin",(0.53,0.30,0.18)),
 material("M_Dhaka_Trousers",(0.045,0.055,0.075)),
 material("M_Dhaka_Shoes",(0.018,0.018,0.022)),
]
parts=[]
def finish_part(obj, mat, bone_hint):
    obj.name="Part_"+bone_hint+"_"+str(len(parts))
    obj.data.materials.append(mat)
    obj["rig_region"]=bone_hint
    parts.append(obj)
def uv(name, loc, scale, mat, bone):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=16, ring_count=10, location=loc)
    o=bpy.context.object; o.name=name; o.scale=scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    finish_part(o,mat,bone)
def capsule(name, a, b, radius, mat, bone):
    mid=(Vector(a)+Vector(b))/2; direction=Vector(b)-Vector(a)
    bpy.ops.mesh.primitive_cylinder_add(vertices=12, radius=radius, depth=direction.length, location=mid)
    o=bpy.context.object; o.name=name; o.rotation_mode="QUATERNION"; o.rotation_quaternion=direction.to_track_quat("Z","Y")
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    finish_part(o,mat,bone)
# torso, pelvis, neck, head
uv("Torso",(0,0,121),(10,16,22),mats[0],"spine_02")
uv("Pelvis",(0,0,96),(9,13,9),mats[2],"pelvis")
capsule("Neck",(0,0,139),(0,0,150),4,mats[1],"neck")
uv("Head",(0,0,160),(8.5,8,12),mats[1],"head")
# arms
for side,sgn in (("l",1),("r",-1)):
    capsule("UpperArm_"+side,(0,15*sgn,135),(0,29*sgn,115),4.8,mats[0],"upperarm_"+side)
    uv("Elbow_"+side,(0,29*sgn,115),(4.4,4.4,4.4),mats[1],"lowerarm_"+side)
    capsule("Forearm_"+side,(0,29*sgn,115),(0,31*sgn,94),3.6,mats[1],"lowerarm_"+side)
    uv("Hand_"+side,(2,32*sgn,88),(3.3,3.1,5.0),mats[1],"hand_"+side)
# Fingers are separate tapered cylinders so each finger chain has deforming geometry.
for side,sgn in (("l",1),("r",-1)):
    finger_specs=[
        ("thumb", -4.0, 5.0, 2, 1.15),
        ("index", -2.0, 7.0, 3, 0.95),
        ("middle", 0.0, 8.0, 3, 0.95),
        ("ring", 2.0, 7.0, 3, 0.9),
        ("pinky", 4.0, 5.5, 3, 0.8),
    ]
    for digit,yoff,length,segments,radius in finger_specs:
        start=Vector((4.0,32.0*sgn+yoff,88.0))
        for seg in range(1,segments+1):
            end=start+Vector((length/segments,(1.0 if digit=="thumb" else 0.0)*sgn,0.0))
            capsule(f"{digit}_{side}_{seg:02d}",start,end,radius,mats[1],f"{digit}_{side}_{seg:02d}")
            start=end

# legs and feet
for side,sgn in (("l",1),("r",-1)):
    capsule("Thigh_"+side,(0,10*sgn,94),(0,10*sgn,53),6.2,mats[2],"thigh_"+side)
    uv("Knee_"+side,(0,10*sgn,53),(5.8,5.8,6),mats[2],"calf_"+side)
    capsule("Calf_"+side,(0,10*sgn,53),(0,10*sgn,12),4.4,mats[2],"calf_"+side)
    uv("Shoe_"+side,(13,10*sgn,7),(9,5,4),mats[3],"foot_"+side)
# Join primitives to a single skinned mesh and assign nearest semantic bone by region.
bpy.ops.object.select_all(action="DESELECT")
for p in parts: p.select_set(True)
bpy.context.view_layer.objects.active=parts[0]; bpy.ops.object.join()
mesh=bpy.context.object; mesh.name="SK_DhakaHuman_Body"
# Bake joined primitive transforms before parenting to the armature.
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
# Keep material assignments from joined meshes; clean normals.
for poly in mesh.data.polygons: poly.use_smooth=True
for bone_name in bones:
    mesh.vertex_groups.new(name=bone_name)
# Each primitive was tagged before joining, but object-level tags are lost on join.
# Assign vertices to the closest bone segment, using region-aware distance weighting.
bone_points={n:(Vector(v[0]),Vector(v[1])) for n,v in bones.items()}
def seg_dist(p,a,b):
    ab=b-a; t=max(0,min(1,(p-a).dot(ab)/(ab.length_squared or 1)))
    return (p-(a+t*ab)).length
for v in mesh.data.vertices:
    p=mesh.matrix_world @ v.co
    ranked=sorted(((seg_dist(p,*bone_points[n]),n) for n in bones if n!="root" and not n.startswith("ik_")),key=lambda x:x[0])
    # Two-bone smooth weights around joints, rigid enough for stylized geometry.
    near=ranked[:2]; inv=[1.0/max(d,0.75) for d,n in near]; total=sum(inv)
    for (d,n),w in zip(near,inv): mesh.vertex_groups[n].add([v.index],w/total,"REPLACE")
arm_mod=mesh.modifiers.new("Armature_Deform","ARMATURE"); arm_mod.object=arm
mesh.parent=arm
# Pose axes and bone roll are kept consistent for Control Rig/IK setup.
for b in arm.data.bones: b.use_deform=(b.name!="root" and not b.name.startswith("ik_"))

def key_pose(action_name, frames, pose_func):
    action=bpy.data.actions.new(action_name)
    arm.animation_data_create(); arm.animation_data.action=action
    for pb in arm.pose.bones: pb.rotation_mode="XYZ"
    for frame in frames:
        bpy.context.scene.frame_set(frame)
        pose_func(frame)
        for pb in arm.pose.bones:
            pb.keyframe_insert(data_path="rotation_euler",frame=frame,group=pb.name)
            if pb.name in ("pelvis","spine_01","spine_02"):
                pb.keyframe_insert(data_path="location",frame=frame,group=pb.name)
    action["looping"]=True
    for fc in action.fcurves:
        for kp in fc.keyframe_points: kp.interpolation="BEZIER"
        if fc.data_path.endswith("rotation_euler") or fc.data_path.endswith("location"):
            for kp in fc.keyframe_points: kp.handle_left_type="AUTO"; kp.handle_right_type="AUTO"
    return action
def reset_pose():
    for pb in arm.pose.bones: pb.rotation_euler=(0,0,0); pb.location=(0,0,0)
def idle_pose(frame):
    reset_pose(); phase=frame*2*math.pi/48
    arm.pose.bones["spine_02"].rotation_euler[0]=math.sin(phase)*.012
    arm.pose.bones["head"].rotation_euler[1]=math.sin(phase*.5)*.018
def walk_pose(frame):
    reset_pose(); phase=(frame-1)*2*math.pi/24; s=math.sin(phase)
    arm.pose.bones["thigh_l"].rotation_euler[1]=s*.52
    arm.pose.bones["thigh_r"].rotation_euler[1]=-s*.52
    arm.pose.bones["calf_l"].rotation_euler[1]=max(0,-s)*.72
    arm.pose.bones["calf_r"].rotation_euler[1]=max(0,s)*.72
    arm.pose.bones["upperarm_l"].rotation_euler[1]=-s*.32
    arm.pose.bones["upperarm_r"].rotation_euler[1]=s*.32
    arm.pose.bones["lowerarm_l"].rotation_euler[1]=-.12
    arm.pose.bones["lowerarm_r"].rotation_euler[1]=-.12
    arm.pose.bones["pelvis"].location.z=abs(s)*.8
    arm.pose.bones["spine_01"].rotation_euler[1]=s*.035
def run_pose(frame):
    walk_pose(frame)
    scale=1.35
    for n in ("thigh_l","thigh_r","calf_l","calf_r","upperarm_l","upperarm_r"):
        arm.pose.bones[n].rotation_euler[1]*=scale
    arm.pose.bones["spine_02"].rotation_euler[1]=-.09
actions=[]
actions.append(key_pose("A_Dhaka_Idle", [1,13,25,37,49], idle_pose))
actions.append(key_pose("A_Dhaka_Walk", [1,7,13,19,25], walk_pose))
actions.append(key_pose("A_Dhaka_Run", [1,7,13,19,25], run_pose))
# Export mesh+skeleton once, then one animation FBX per action using same bind skeleton.
def export_fbx(path, include_mesh, action_name=None):
    bpy.ops.object.select_all(action="DESELECT"); arm.select_set(True)
    if include_mesh: mesh.select_set(True)
    bpy.context.view_layer.objects.active=arm
    if action_name: arm.animation_data.action=bpy.data.actions.get(action_name)
    bpy.ops.export_scene.fbx(filepath=path, use_selection=True, object_types={"ARMATURE","MESH"},
        apply_scale_options="FBX_SCALE_ALL", axis_forward="-Y", axis_up="Z",
        add_leaf_bones=False, use_armature_deform_only=False, bake_anim=bool(action_name),
        bake_anim_use_all_bones=True, bake_anim_use_nla_strips=False, bake_anim_use_all_actions=False,
        use_mesh_modifiers=True, mesh_smooth_type="FACE", path_mode="AUTO", primary_bone_axis="Y", secondary_bone_axis="X")
export_fbx(os.path.join(OUT,"SK_DhakaHuman.fbx"),True,None)
for action in actions:
    export_fbx(os.path.join(OUT,action.name+".fbx"),False,action.name)
print("Created rig source:", OUT)
print("Outputs: SK_DhakaHuman.fbx, A_Dhaka_Idle.fbx, A_Dhaka_Walk.fbx, A_Dhaka_Run.fbx")
