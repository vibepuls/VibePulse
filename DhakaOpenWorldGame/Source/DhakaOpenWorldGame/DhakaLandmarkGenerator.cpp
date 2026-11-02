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
    const int32 Rows=FMath::Clamp(Floors,2,12);
    for(int32 Row=0;Row<Rows;++Row)
    {
        const float Z=H*(Row+.5f)/Rows;
        // Combine window bays into long strips to keep runtime component count mobile-friendly.
        Box(TEXT("District_Tower_FrontWindowBand"),P+FVector(0,-D*.5f-2.f,Z),FVector(W*.82f,2.f,FMath::Min(28.f,H/Rows*.38f)),Glass);
        Box(TEXT("District_Tower_RearWindowBand"),P+FVector(0,D*.5f+2.f,Z),FVector(W*.82f,2.f,FMath::Min(28.f,H/Rows*.38f)),Glass);
        Box(TEXT("District_Tower_LeftWindowBand"),P+FVector(-W*.5f-2.f,0,Z),FVector(2.f,D*.82f,FMath::Min(28.f,H/Rows*.38f)),Glass);
        Box(TEXT("District_Tower_RightWindowBand"),P+FVector(W*.5f+2.f,0,Z),FVector(2.f,D*.82f,FMath::Min(28.f,H/Rows*.38f)),Glass);
    }
