#include "DhakaCityGenerator.h"
#include "ProceduralMeshComponent.h"
#include "Materials/Material.h"
#include "UObject/ConstructorHelpers.h"

ADhakaCityGenerator::ADhakaCityGenerator(){ PrimaryActorTick.bCanEverTick=false; SceneRoot=CreateDefaultSubobject<USceneComponent>(TEXT("SceneRoot")); SetRootComponent(SceneRoot); SetActorEnableCollision(false); }
void ADhakaCityGenerator::ClearGenerated(){ for(auto* M:GeneratedMeshes){if(M){M->DestroyComponent();}} GeneratedMeshes.Reset(); }
void ADhakaCityGenerator::OnConstruction(const FTransform& Transform)
{
    Super::OnConstruction(Transform); ClearGenerated(); FRandomStream R(RandomSeed);
    const float Step=CityExtent/FMath::Max(4,GridBlocks); const float Start=-CityExtent*0.5f;
    if(bGenerateRoads){
        for(int32 I=0;I<=GridBlocks;++I){
            const float P=Start+I*Step;
            AddBoxMesh(FVector(P,0,0),FVector(26.f,CityExtent+Step,18.f),FLinearColor(0.075f,0.085f,0.09f),true);
            AddBoxMesh(FVector(0,P,0),FVector(CityExtent+Step,26.f,18.f),FLinearColor(0.075f,0.085f,0.09f),true);
            AddBoxMesh(FVector(P,0,10.f),FVector(1.5f,CityExtent+Step,1.f),FLinearColor(0.82f,0.72f,0.43f),false);
            AddBoxMesh(FVector(0,P,10.f),FVector(CityExtent+Step,1.5f,1.f),FLinearColor(0.82f,0.72f,0.43f),false);
        }
    }
    if(bGenerateBuildings){
        for(int32 X=0;X<GridBlocks;++X) for(int32 Y=0;Y<GridBlocks;++Y){
            if(R.FRand()<0.12f) continue;
            const float PX=Start+(X+0.5f)*Step, PZ=Start+(Y+0.5f)*Step;
            const float W=Step*R.FRandRange(0.28f,0.65f), D=Step*R.FRandRange(0.28f,0.65f), H=R.FRandRange(350.f,2100.f);
            const FLinearColor C=FLinearColor::LerpUsingHSV(FLinearColor(0.34f,0.29f,0.22f),FLinearColor(0.63f,0.61f,0.54f),R.FRand());
            AddBoxMesh(FVector(PX,PZ,H*0.5f),FVector(W,D,H),C,true);
            AddBoxMesh(FVector(PX,PZ,H+24.f),FVector(W*0.7f,D*0.7f,48.f),FLinearColor(0.12f,0.15f,0.17f),false);
            if(bGenerateStreetProps && R.FRand()<0.38f){
                AddBoxMesh(FVector(PX+W*0.58f,PZ+D*0.35f,52.f),FVector(W*0.75f,85.f,105.f),R.FRand()<0.5f?FLinearColor(0.62f,0.13f,0.08f):FLinearColor(0.08f,0.38f,0.26f),false);
            }
        }
    }
    if(bGenerateStreetProps){
        for(int32 I=0;I<GridBlocks*2;++I){
            const float X=R.FRandRange(Start, -Start), Y=R.FRandRange(Start,-Start);
            AddBoxMesh(FVector(X,Y,90.f),FVector(20.f,20.f,180.f),FLinearColor(0.12f,0.14f,0.15f),true);
            AddBoxMesh(FVector(X,Y,185.f),FVector(160.f,12.f,12.f),FLinearColor(0.08f,0.09f,0.1f),false);
        }
    }
}
void ADhakaCityGenerator::AddBoxMesh(const FVector& Center,const FVector& Size,const FLinearColor& Color,bool bCollision)
{
    UProceduralMeshComponent* Mesh=NewObject<UProceduralMeshComponent>(this);
    if(!Mesh) return; Mesh->SetupAttachment(SceneRoot); AddInstanceComponent(Mesh); Mesh->RegisterComponent(); Mesh->SetRelativeLocation(Center);
    const float X=Size.X*0.5f,Y=Size.Y*0.5f,Z=Size.Z*0.5f;
    TArray<FVector> V={ {-X,-Y,-Z},{X,-Y,-Z},{X,Y,-Z},{-X,Y,-Z},{-X,-Y,Z},{X,-Y,Z},{X,Y,Z},{-X,Y,Z} };
    TArray<int32> T={0,2,1,0,3,2,4,5,6,4,6,7,0,1,5,0,5,4,2,3,7,2,7,6,1,2,6,1,6,5,3,0,4,3,4,7};
    TArray<FVector> N; N.Init(FVector::UpVector,8); TArray<FVector2D> UV={{0,0},{1,0},{1,1},{0,1},{0,0},{1,0},{1,1},{0,1}};
    TArray<FColor> Colors; Colors.Init(Color.ToFColor(true),8); TArray<FProcMeshTangent> Tangents; Tangents.Init(FProcMeshTangent(1,0,0),8);
    Mesh->CreateMeshSection(0,V,T,N,UV,Colors,Tangents,bCollision);
    static UMaterialInterface* Mat=LoadObject<UMaterialInterface>(nullptr,TEXT("/Engine/BasicShapes/BasicShapeMaterial.BasicShapeMaterial"));
    if(Mat) Mesh->SetMaterial(0,Mat);
    GeneratedMeshes.Add(Mesh);
}
