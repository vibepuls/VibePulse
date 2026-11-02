# Run inside Unreal Editor (Python Editor Script Plugin enabled).
# Import FBX output from build_character_rig_blender.py and generate character assets.
# Example:
# py "D:/.../DhakaOpenWorldGame/Scripts/import_character_rig_unreal.py" --source "D:/.../ContentSource/Characters/Player"
import unreal, os, sys

def arg_value(flag, default):
    argv=sys.argv
    return argv[argv.index(flag)+1] if flag in argv else default

SOURCE=os.path.abspath(arg_value("--source", os.path.join(os.path.dirname(__file__),"../ContentSource/Characters/Player")))
ROOT="/Game/Characters/Player"
SKELETAL_PATH=ROOT+"/SK_DhakaHuman"
ANIMBP_PATH=ROOT+"/ABP_PlayerDhaka"
IKRIG_PATH=ROOT+"/IK_DhakaHuman"
CONTROLRIG_PATH=ROOT+"/CR_DhakaHuman"

if not unreal.EditorAssetLibrary.does_directory_exist(ROOT):
    unreal.EditorAssetLibrary.make_directory(ROOT)

def import_fbx(filename, destination, import_mesh, import_animations, skeleton=None, mesh_type="Skeletal"):
    path=os.path.join(SOURCE,filename)
    if not os.path.isfile(path):
        unreal.log_warning("Character rig source missing: "+path)
        return None
    task=unreal.AssetImportTask()
    task.filename=path
    task.destination_path=destination
    task.automated=True
    task.save=True
    task.replace_existing=True
    task.replace_existing_settings=True
    task.options=unreal.FbxImportUI()
    task.options.set_editor_property("import_mesh",import_mesh)
    task.options.set_editor_property("import_as_skeletal",True)
    task.options.set_editor_property("import_animations",import_animations)
    task.options.set_editor_property("mesh_type_to_import",unreal.FBXImportType.FBXIT_SKELETAL_MESH)
    task.options.set_editor_property("create_physics_asset",import_mesh)
    task.options.set_editor_property("import_materials",True if import_mesh else False)
    task.options.set_editor_property("import_textures",True if import_mesh else False)
    if skeleton:
        task.options.set_editor_property("skeleton",skeleton)
    unreal.AssetToolsHelpers.get_asset_tools().import_asset_tasks([task])
    for obj in task.imported_object_paths:
        unreal.log("Imported character asset: "+obj)
    return task.imported_object_paths

mesh_imports=import_fbx("SK_DhakaHuman.fbx",ROOT,True,False)
skeleton=None
skeletal_mesh=None
for path in (mesh_imports or []):
    asset=unreal.load_asset(path)
    if isinstance(asset,unreal.SkeletalMesh): skeletal_mesh=asset
    if isinstance(asset,unreal.Skeleton): skeleton=asset
if skeletal_mesh and not skeleton:
    try: skeleton=skeletal_mesh.get_editor_property("skeleton")
    except Exception: pass
if not skeleton:
    candidate=unreal.EditorAssetLibrary.load_asset(SKELETAL_PATH)
    if candidate:
        try: skeleton=candidate.get_editor_property("skeleton")
        except Exception: pass
if not skeleton:
    unreal.log_error("Could not resolve imported skeleton. Inspect FBX import result before creating animation assets.")
    raise RuntimeError("SK_DhakaHuman skeleton import failed")

for anim in ("A_Dhaka_Idle","A_Dhaka_Walk","A_Dhaka_Run"):
    import_fbx(anim+".fbx",ROOT,False,True,skeleton)

# Create a real Animation Blueprint asset targeting the imported skeleton.
if not unreal.EditorAssetLibrary.does_asset_exist(ANIMBP_PATH):
    try:
        factory=unreal.AnimBlueprintFactory()
        factory.set_editor_property("target_skeleton",skeleton)
        native_anim_class=unreal.load_class(None,"/Script/DhakaOpenWorldGame.DhakaCharacterAnimInstance")
        factory.set_editor_property("parent_class",native_anim_class or unreal.AnimInstance)
        bp=unreal.AssetToolsHelpers.get_asset_tools().create_asset("ABP_PlayerDhaka",ROOT,unreal.AnimBlueprint,factory)
        if bp:
            unreal.EditorAssetLibrary.save_loaded_asset(bp)
            unreal.log("Created ABP_PlayerDhaka with native GroundSpeed/Direction/VerticalSpeed/bIsMoving/bIsInAir/bIsSprinting variables. The editor must contain a locomotion state machine before this blueprint can drive the imported clips.")
    except Exception as e:
        unreal.log_warning("Animation Blueprint factory is not exposed by this engine's Python API: "+str(e))

# Create IK Rig and Control Rig assets when their editor factories are exposed by this UE build.
# UE minor versions expose different factory classes; do not silently pretend an asset exists.
def create_optional_rig_asset(factory_name, asset_class_name, asset_name):
    if unreal.EditorAssetLibrary.does_asset_exist(ROOT+"/"+asset_name):
        unreal.log("Already exists: "+asset_name); return
    factory_type=getattr(unreal,factory_name,None)
    asset_type=getattr(unreal,asset_class_name,None)
    if not factory_type or not asset_type:
        unreal.log_warning(factory_name+" / "+asset_class_name+" not exposed. Enable the matching plugin and create "+asset_name+" in the editor.")
        return
    try:
        factory=factory_type()
        asset=unreal.AssetToolsHelpers.get_asset_tools().create_asset(asset_name,ROOT,asset_type,factory)
        if asset:
            unreal.EditorAssetLibrary.save_loaded_asset(asset)
            unreal.log("Created "+asset_name+"; verify hierarchy/solver setup in the editor.")
    except Exception as e:
        unreal.log_warning("Could not create "+asset_name+" through this UE Python API: "+str(e))

# Build a configured IK Rig: skeletal mesh, retarget chains, full-body solver and goals.
try:
    ikr=unreal.EditorAssetLibrary.load_asset(IKRIG_PATH)
    if not ikr:
        ikr=unreal.AssetToolsHelpers.get_asset_tools().create_asset(
            asset_name="IK_DhakaHuman",package_path=ROOT,
            asset_class=unreal.IKRigDefinition,factory=unreal.IKRigDefinitionFactory())
    if ikr:
        ik_controller=unreal.IKRigController.get_controller(ikr)
        ik_controller.set_skeletal_mesh(skeletal_mesh)
        ik_controller.apply_auto_generated_retarget_definition()
        ik_controller.apply_auto_fbik()
        unreal.EditorAssetLibrary.save_loaded_asset(ikr)
        unreal.log("Configured IK_DhakaHuman with auto retarget chains and Full Body IK.")
except Exception as e:
    unreal.log_warning("IK Rig setup needs review in this UE version: "+str(e))

# Create a Control Rig based on the imported skeleton (not an empty generic asset).
try:
    cr=unreal.EditorAssetLibrary.load_asset(CONTROLRIG_PATH)
    if not cr:
        cr=unreal.ControlRigBlueprintFactory.create_control_rig_from_skeletal_mesh_or_skeleton(selected_object=skeletal_mesh)
        if cr:
            unreal.EditorAssetLibrary.rename_asset(cr.get_path_name(),CONTROLRIG_PATH)
    if cr:
        cr.set_preview_mesh(skeletal_mesh)
        cr.recompile_vm_if_required()
        unreal.BlueprintEditorLibrary.compile_blueprint(cr)
        unreal.EditorAssetLibrary.save_loaded_asset(cr)
        unreal.log("Created and compiled CR_DhakaHuman from the imported skeletal mesh. Verify FK controls and add IK control-to-bone graph nodes in the Control Rig editor.")
except Exception as e:
    unreal.log_warning("Control Rig setup needs review in this UE version: "+str(e))

unreal.log("Character import pass finished. Validate imported mesh, animation clips, IK solver/goals and Control Rig graph in Unreal Editor before shipping.")
