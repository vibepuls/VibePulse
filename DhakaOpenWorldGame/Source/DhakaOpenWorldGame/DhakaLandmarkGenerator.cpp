#include "DhakaLandmarkGenerator.h"
#include "Components/SceneComponent.h"
#include "Components/StaticMeshComponent.h"
#include "Materials/MaterialInstanceDynamic.h"
#include "UObject/ConstructorHelpers.h"
#include "Engine/StaticMesh.h"

ADhakaLandmarkGenerator::ADhakaLandmarkGenerator()
{
    PrimaryActorTick.bCanEverTick=false;SceneRoot=CreateDefaultSubobject<USceneComponent>(TEXT("SceneRoot"));SetRootComponent(SceneRoot);
    static ConstructorHelpers::FObjectFinder<UStaticMesh> C(TEXT("/Engine/BasicShapes/Cube.Cube"));
    static ConstructorHelpers::FObjectFinder<UStaticMesh> Y(TEXT("/Engine/BasicShapes/Cylinder.Cylinder"));
    static ConstructorHelpers::FObjectFinder<UStaticMesh> S(TEXT("/Engine/BasicShapes/Sphere.Sphere"));
    if(C.Succeeded())Cube=C.Object;if(Y.Succeeded())Cylinder=Y.Object;if(S.Succeeded())Sphere=S.Object;
}
void ADhakaLandmarkGenerator::ClearParts(){for(UStaticMeshComponent* P:Parts)if(P)P->DestroyComponent();Parts.Reset();}
void ADhakaLandmarkGenerator::OnConstruction(const FTransform& Transform)
{
    Super::OnConstruction(Transform);ClearParts();FRandomStream R(RandomSeed);
    if(bGenerateOldDhaka)BuildOldDhaka();
    if(bGenerateModernDistricts)BuildModernDhaka(R);
    if(bGenerateRiverfront)BuildRiverfront();
}
void ADhakaLandmarkGenerator::Box(const TCHAR* Name,FVector P,FVector S,FLinearColor Color,FRotator R)
{
    if(!Cube)return;UStaticMeshComponent* C=NewObject<UStaticMeshComponent>(this,Name);if(!C)return;
    C->SetupAttachment(SceneRoot);C->SetStaticMesh(Cube);C->SetRelativeLocation(P);C->SetRelativeScale3D(S);C->SetRelativeRotation(R);C->SetCollisionEnabled(ECollisionEnabled::QueryAndPhysics);
    if(UMaterialInterface* Base=LoadObject<UMaterialInterface>(nullptr,TEXT("/Engine/BasicShapes/BasicShapeMaterial.BasicShapeMaterial"))){UMaterialInstanceDynamic* M=UMaterialInstanceDynamic::Create(Base,this);if(M){M->SetVectorParameterValue(TEXT("BaseColor"),Color);C->SetMaterial(0,M);}}
    AddInstanceComponent(C);C->RegisterComponent();Parts.Add(C);
}
void ADhakaLandmarkGenerator::Wall(FVector P,FVector S,FLinearColor Color){Box(TEXT("Landmark_Wall"),P,S,Color);}
void ADhakaLandmarkGenerator::Tower(FVector P,float W,float D,float H,FLinearColor Color,int32 Floors)
{
    Box(TEXT("District_Tower_Core"),P+FVector(0,0,H*.5f),FVector(W,D,H),Color);
    const FLinearColor Glass(.10f,.25f,.31f);
    // Four continuous facade bands keep the procedural district set efficient on mobile GPUs.
    const float GlassH=H*.78f, GlassZ=H*.52f;
    Box(TEXT("District_Tower_FrontGlass"),P+FVector(0,-D*.5f-2.f,GlassZ),FVector(W*.80f,2.f,GlassH),Glass);
    Box(TEXT("District_Tower_RearGlass"),P+FVector(0,D*.5f+2.f,GlassZ),FVector(W*.80f,2.f,GlassH),Glass);
    Box(TEXT("District_Tower_LeftGlass"),P+FVector(-W*.5f-2.f,0,GlassZ),FVector(2.f,D*.80f,GlassH),Glass);
    Box(TEXT("District_Tower_RightGlass"),P+FVector(W*.5f+2.f,0,GlassZ),FVector(2.f,D*.80f,GlassH),Glass);
    const int32 FloorBands=FMath::Clamp(Floors,3,10);
    for(int32 Row=1;Row<FloorBands;++Row)
    {
        const float Z=H*float(Row)/float(FloorBands);
        Box(TEXT("District_Tower_FloorBand_Front"),P+FVector(0,-D*.5f-4.f,Z),FVector(W*.82f,3.f,3.f),FLinearColor(.28f,.31f,.32f));
        Box(TEXT("District_Tower_FloorBand_Rear"),P+FVector(0,D*.5f+4.f,Z),FVector(W*.82f,3.f,3.f),FLinearColor(.28f,.31f,.32f));
    }
