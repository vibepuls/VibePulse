#include "DhakaStreetLifeGenerator.h"
#include "Components/SceneComponent.h"
#include "Components/StaticMeshComponent.h"
#include "UObject/ConstructorHelpers.h"
#include "Materials/MaterialInstanceDynamic.h"
#include "Engine/StaticMesh.h"

ADhakaStreetLifeGenerator::ADhakaStreetLifeGenerator()
{
    PrimaryActorTick.bCanEverTick=false;
    SceneRoot=CreateDefaultSubobject<USceneComponent>(TEXT("SceneRoot"));
    SetRootComponent(SceneRoot);
    static ConstructorHelpers::FObjectFinder<UStaticMesh> Cube(TEXT("/Engine/BasicShapes/Cube.Cube"));
    static ConstructorHelpers::FObjectFinder<UStaticMesh> Cylinder(TEXT("/Engine/BasicShapes/Cylinder.Cylinder"));
    static ConstructorHelpers::FObjectFinder<UStaticMesh> Sphere(TEXT("/Engine/BasicShapes/Sphere.Sphere"));
    if(Cube.Succeeded()) CubeMesh=Cube.Object;
    if(Cylinder.Succeeded()) CylinderMesh=Cylinder.Object;
    if(Sphere.Succeeded()) SphereMesh=Sphere.Object;
}
void ADhakaStreetLifeGenerator::ClearGenerated()
{
    for(UStaticMeshComponent* Part:GeneratedParts) if(Part) Part->DestroyComponent();
    GeneratedParts.Reset();
}
void ADhakaStreetLifeGenerator::OnConstruction(const FTransform& Transform)
{
    Super::OnConstruction(Transform);
    ClearGenerated();
    FRandomStream Random(RandomSeed);
    if(bGenerateTeaAndFoodStalls)
        for(int32 I=0;I<VendorCount;++I)
        {
            FVector P(Random.FRandRange(-AreaExtent,AreaExtent),Random.FRandRange(-AreaExtent,AreaExtent),0.f);
            BuildVendor(P,Random.RandRange(0,5),Random);
        }
    if(bGenerateStreetFurniture)
        for(int32 I=0;I<StreetPropCount;++I)
        {
            FVector P(Random.FRandRange(-AreaExtent,AreaExtent),Random.FRandRange(-AreaExtent,AreaExtent),0.f);
            BuildStreetProp(P,Random.RandRange(0,7),Random);
        }
    if(bGenerateTreesAndPoles)
        for(int32 I=0;I<TreeCount;++I)
        {
            FVector P(Random.FRandRange(-AreaExtent,AreaExtent),Random.FRandRange(-AreaExtent,AreaExtent),0.f);
            if(Random.FRand()<.58f) BuildTree(P,Random);
            else BuildStreetProp(P,8+Random.RandRange(0,2),Random);
        }
}
UStaticMeshComponent* ADhakaStreetLifeGenerator::AddPart(const TCHAR* Name,UStaticMesh* Mesh,FVector Location,FVector Scale,FLinearColor Color,FRotator Rotation)
{
    if(!Mesh) return nullptr;
    UStaticMeshComponent* Part=NewObject<UStaticMeshComponent>(this,Name);
    if(!Part) return nullptr;
    Part->SetupAttachment(SceneRoot);
    Part->SetStaticMesh(Mesh);
    Part->SetRelativeLocation(Location);
    Part->SetRelativeScale3D(Scale);
    Part->SetRelativeRotation(Rotation);
    Part->SetCollisionEnabled(ECollisionEnabled::QueryAndPhysics);
    Part->SetCollisionResponseToChannel(ECC_Pawn,ECR_Block);
    if(UMaterialInterface* Base=LoadObject<UMaterialInterface>(nullptr,TEXT("/Engine/BasicShapes/BasicShapeMaterial.BasicShapeMaterial")))
    {
        UMaterialInstanceDynamic* Mat=UMaterialInstanceDynamic::Create(Base,this);
        if(Mat){Mat->SetVectorParameterValue(TEXT("BaseColor"),Color);Part->SetMaterial(0,Mat);}
    }
    AddInstanceComponent(Part);
    Part->RegisterComponent();
    GeneratedParts.Add(Part);
    return Part;
}
void ADhakaStreetLifeGenerator::BuildVendor(FVector P,int32 Kind,FRandomStream& R)
{
    const FLinearColor Metal(.16f,.17f,.16f),Wood(.34f,.20f,.10f),Canvas(.78f,.64f,.36f);
    const FLinearColor Sign=Kind%2?FLinearColor(.60f,.08f,.05f):FLinearColor(.04f,.35f,.22f);
    const float W=R.FRandRange(180.f,290.f),D=R.FRandRange(120.f,190.f);
    const FString Tag=FString::Printf(TEXT("Vendor_%d"),Kind);
    AddPart(*(Tag+TEXT("_Counter")),CubeMesh,P+FVector(0,0,48),FVector(W,D,48),Kind==0?Wood:Metal);
    AddPart(*(Tag+TEXT("_Canopy")),CubeMesh,P+FVector(0,0,190),FVector(W*1.22f,D*1.3f,10),Canvas,FRotator(0,0,R.FRandRange(-4.f,4.f)));
    for(int32 Side:{-1,1})
        AddPart(*(Tag+FString::Printf(TEXT("_Post_%d"),Side)),CylinderMesh,P+FVector(Side*W*.54f,0,112),FVector(5,5,78),Metal);
    for(int32 Item=0;Item<5;++Item)
    {
        const FLinearColor Food=FLinearColor(R.FRandRange(.55f,1.f),R.FRandRange(.12f,.65f),R.FRandRange(.03f,.22f));
        AddPart(*(Tag+FString::Printf(TEXT("_Display_%d"),Item)),SphereMesh,
            P+FVector(R.FRandRange(-W*.4f,W*.4f),R.FRandRange(-D*.35f,D*.35f),92),
            FVector(9,9,9),Kind==1||Kind==2?Food:Sign);
    }
    AddPart(*(Tag+TEXT("_Signboard")),CubeMesh,P+FVector(0,-D*.64f,150),FVector(W*.65f,5,24),Sign);
    if(Kind==0||Kind==1||Kind==2)
    {
        AddPart(*(Tag+TEXT("_Stove")),CylinderMesh,P+FVector(W*.28f,D*.2f,77),FVector(16,16,14),FLinearColor(.07f,.07f,.07f));
        AddPart(*(Tag+TEXT("_Kettle")),SphereMesh,P+FVector(W*.28f,D*.2f,102),FVector(12,12,12),FLinearColor(.62f,.63f,.59f));
    }
    if(R.FRand()<.75f)
        for(int32 Chair=0;Chair<2;++Chair)
            AddPart(*(Tag+FString::Printf(TEXT("_PlasticChair_%d"),Chair)),CubeMesh,
                P+FVector((Chair?1.f:-1.f)*W*.8f,D*.5f,22),FVector(24,24,5),FLinearColor(.08f,.23f,.62f));
}
void ADhakaStreetLifeGenerator::BuildTree(FVector P,FRandomStream& R)
{
    const float H=R.FRandRange(260.f,480.f), Crown=R.FRandRange(95.f,170.f);
    AddPart(TEXT("Tree_Trunk"),CylinderMesh,P+FVector(0,0,H*.42f),FVector(13,13,H*.42f),FLinearColor(.25f,.14f,.07f));
    for(int32 I=0;I<4;++I)
        AddPart(TEXT("Tree_Crown"),SphereMesh,P+FVector(R.FRandRange(-35.f,35.f),R.FRandRange(-35.f,35.f),H*.72f+I*22.f),
            FVector(Crown/100.f,Crown/100.f,Crown/100.f),R.FRandRange(0.f,1.f)>.3f?FLinearColor(.10f,.31f,.12f):FLinearColor(.18f,.39f,.15f));
}
void ADhakaStreetLifeGenerator::BuildStreetProp(FVector P,int32 Kind,FRandomStream& R)
{
    if(Kind==0) // plastic chair
    {
        AddPart(TEXT("Street_ChairSeat"),CubeMesh,P+FVector(0,0,38),FVector(38,36,5),FLinearColor(.08f,.26f,.68f));
        AddPart(TEXT("Street_ChairBack"),CubeMesh,P+FVector(-28,0,61),FVector(5,36,27),FLinearColor(.08f,.26f,.68f));
        for(int32 X:{-1,1})for(int32 Y:{-1,1})AddPart(TEXT("Street_ChairLeg"),CylinderMesh,P+FVector(X*27,Y*24,17),FVector(3,3,17),FLinearColor(.07f,.08f,.08f));
    }
    else if(Kind==1) AddPart(TEXT("Street_Table"),CubeMesh,P+FVector(0,0,58),FVector(75,42,5),FLinearColor(.38f,.23f,.12f));
    else if(Kind==2) AddPart(TEXT("Road_Barrier"),CubeMesh,P+FVector(0,0,35),FVector(80,20,35),FLinearColor(.78f,.30f,.06f));
    else if(Kind==3) AddPart(TEXT("Road_DrainCover"),CubeMesh,P+FVector(0,0,3),FVector(75,40,3),FLinearColor(.22f,.23f,.22f));
    else if(Kind==4) AddPart(TEXT("Roadside_Crate"),CubeMesh,P+FVector(0,0,20),FVector(30,28,20),FLinearColor(.34f,.22f,.10f));
    else if(Kind==5) AddPart(TEXT("Roadside_Bin"),CylinderMesh,P+FVector(0,0,35),FVector(20,20,35),FLinearColor(.13f,.32f,.17f));
    else if(Kind==6) AddPart(TEXT("Street_LampPost"),CylinderMesh,P+FVector(0,0,190),FVector(5,5,190),FLinearColor(.17f,.18f,.17f));
    else if(Kind==7) AddPart(TEXT("Street_Sign"),CubeMesh,P+FVector(0,0,190),FVector(5,25,25),FLinearColor(.04f,.28f,.16f));
    else if(Kind==8)
    {
        AddPart(TEXT("ElectricPole"),CylinderMesh,P+FVector(0,0,270),FVector(7,7,270),FLinearColor(.28f,.27f,.23f));
        AddPart(TEXT("ElectricCrossbar"),CubeMesh,P+FVector(0,0,490),FVector(95,7,5),FLinearColor(.22f,.22f,.20f));
    }
    else
    {
        AddPart(TEXT("Roadside_Tarpaulin"),CubeMesh,P+FVector(0,0,85),FVector(90,65,5),FLinearColor(.32f,.27f,.19f));
        AddPart(TEXT("Roadside_TarpaulinPole"),CylinderMesh,P+FVector(0,0,42),FVector(4,4,42),FLinearColor(.24f,.19f,.12f));
    }
}
