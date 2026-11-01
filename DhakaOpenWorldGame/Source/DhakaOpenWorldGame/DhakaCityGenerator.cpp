#include "DhakaCityGenerator.h"
#include "ProceduralMeshComponent.h"
#include "Materials/Material.h"
#include "UObject/ConstructorHelpers.h"

ADhakaCityGenerator::ADhakaCityGenerator(){ PrimaryActorTick.bCanEverTick=false; SceneRoot=CreateDefaultSubobject<USceneComponent>(TEXT("SceneRoot")); SetRootComponent(SceneRoot); }
void ADhakaCityGenerator::ClearGenerated(){ for(auto* M:GeneratedMeshes){if(M){M->DestroyComponent();}} GeneratedMeshes.Reset(); }
void ADhakaCityGenerator::OnConstruction(const FTransform& Transform)
{
    Super::OnConstruction(Transform); ClearGenerated(); FRandomStream R(RandomSeed);
    const float Step=CityExtent/FMath::Max(4,GridBlocks); const float Start=-CityExtent*0.5f;
    AddBoxMesh(FVector(0,0,-90.f),FVector(CityExtent+20000.f,CityExtent+20000.f,100.f),FLinearColor(0.19f,0.27f,0.17f),true);
    if(bGenerateRoads){
        for(int32 I=0;I<=GridBlocks;++I){
            const float P=Start+I*Step;
            AddBoxMesh(FVector(P,0,0),FVector(900.f,CityExtent+Step,18.f),FLinearColor(0.075f,0.085f,0.09f),true);
            AddBoxMesh(FVector(0,P,0),FVector(CityExtent+Step,900.f,18.f),FLinearColor(0.075f,0.085f,0.09f),true);
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
            AddBuildingMesh(PX,PZ,W,D,H,C,R);
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
    static UMaterialInterface* Mat=LoadObject<UMaterialInterface>(nullptr,TEXT("/Engine/EngineDebugMaterials/VertexColorMaterial.VertexColorMaterial"));
    if(Mat) Mesh->SetMaterial(0,Mat);
    GeneratedMeshes.Add(Mesh);
}

namespace
{
    void AppendBoxGeometry(const FVector& Center,const FVector& Size,const FColor& Color,
        TArray<FVector>& Vertices,TArray<int32>& Triangles,TArray<FVector>& Normals,
        TArray<FVector2D>& UVs,TArray<FColor>& Colors,TArray<FProcMeshTangent>& Tangents)
    {
        const int32 Base=Vertices.Num();const float X=Size.X*.5f,Y=Size.Y*.5f,Z=Size.Z*.5f;
        const FVector V[8]={Center+FVector(-X,-Y,-Z),Center+FVector(X,-Y,-Z),Center+FVector(X,Y,-Z),Center+FVector(-X,Y,-Z),
            Center+FVector(-X,-Y,Z),Center+FVector(X,-Y,Z),Center+FVector(X,Y,Z),Center+FVector(-X,Y,Z)};
        for(const FVector& P:V)Vertices.Add(P);
        const int32 T[36]={0,2,1,0,3,2,4,5,6,4,6,7,0,1,5,0,5,4,2,3,7,2,7,6,1,2,6,1,6,5,3,0,4,3,4,7};
        for(int32 I:T)Triangles.Add(Base+I);
        for(int32 I=0;I<8;++I){Normals.Add(FVector::UpVector);UVs.Add(FVector2D((I==1||I==2||I==5||I==6)?1.f:0.f,(I>=4)?1.f:0.f));Colors.Add(Color);Tangents.Add(FProcMeshTangent(1,0,0));}
    }
}
void ADhakaCityGenerator::AddBuildingMesh(float X,float Y,float Width,float Depth,float Height,const FLinearColor& Color,FRandomStream& Random)
{
    UProceduralMeshComponent* Mesh=NewObject<UProceduralMeshComponent>(this);if(!Mesh)return;
    Mesh->SetupAttachment(SceneRoot);AddInstanceComponent(Mesh);Mesh->RegisterComponent();Mesh->SetRelativeLocation(FVector(X,Y,0));
    TArray<FVector> V,N;TArray<int32> T;TArray<FVector2D> UV;TArray<FColor> C;TArray<FProcMeshTangent> Tangents;
    auto Box=[&](FVector Center,FVector Size,FLinearColor Tint){AppendBoxGeometry(Center,Size,Tint.ToFColor(true),V,T,N,UV,C,Tangents);};
    Box(FVector(0,0,Height*.5f),FVector(Width,Depth,Height),Color);
    Box(FVector(0,0,Height+24.f),FVector(Width*.72f,Depth*.72f,48.f),FLinearColor(.12f,.15f,.17f));
    const int32 Floors=FMath::Clamp(FMath::FloorToInt(Height/420.f),2,6);
    const int32 Columns=FMath::Clamp(FMath::FloorToInt(Width/1800.f),2,7);
    const float WindowW=FMath::Min(210.f,Width/(Columns*2.3f)),WindowH=FMath::Min(170.f,Height/(Floors*2.7f));
    const FLinearColor Glass=Random.FRand()<.35f?FLinearColor(.12f,.25f,.31f):FLinearColor(.27f,.42f,.48f);
    for(int32 Floor=0;Floor<Floors;++Floor){
        const float Z=150.f+(Floor+1)*(Height-300.f)/(Floors+1);
        for(int32 Col=0;Col<Columns;++Col){
            const float AlongX=-Width*.5f+(Col+.5f)*Width/Columns;
            const float AlongY=-Depth*.5f+(Col+.5f)*Depth/Columns;
            Box(FVector(AlongX,-Depth*.5f-5.f,Z),FVector(WindowW,10.f,WindowH),Glass);
            Box(FVector(AlongX,Depth*.5f+5.f,Z),FVector(WindowW,10.f,WindowH),Glass);
            Box(FVector(-Width*.5f-5.f,AlongY,Z),FVector(10.f,WindowW,WindowH),Glass);
            Box(FVector(Width*.5f+5.f,AlongY,Z),FVector(10.f,WindowW,WindowH),Glass);
        }
        if(Floor>0&&Random.FRand()<.45f){
            Box(FVector(0,-Depth*.5f-20.f,Z-WindowH*.55f),FVector(Width*.66f,34.f,16.f),FLinearColor(.48f,.48f,.43f));
            Box(FVector(0,-Depth*.5f-36.f,Z-WindowH*.35f),FVector(Width*.66f,5.f,55.f),FLinearColor(.24f,.29f,.3f));
        }
        if(Random.FRand()<.42f){
            const float ACX=Random.FRandRange(-Width*.35f,Width*.35f);
            Box(FVector(ACX,-Depth*.5f-18.f,Z-WindowH*.2f),FVector(70.f,35.f,65.f),FLinearColor(.54f,.56f,.55f));
        }
    }
    const FLinearColor ShopColor=Random.FRand()<.5f?FLinearColor(.62f,.13f,.08f):FLinearColor(.08f,.38f,.26f);
    Box(FVector(0,-Depth*.5f-8.f,85.f),FVector(Width*.7f,16.f,145.f),ShopColor);
    Box(FVector(0,-Depth*.5f-18.f,180.f),FVector(Width*.75f,8.f,42.f),FLinearColor(.91f,.74f,.29f));
    if(Random.FRand()<.65f)Box(FVector(Width*.25f,Depth*.15f,Height+90.f),FVector(280.f,220.f,180.f),FLinearColor(.42f,.43f,.4f));
    Mesh->CreateMeshSection(0,V,T,N,UV,C,Tangents,true);
    static UMaterialInterface* VertexMat=LoadObject<UMaterialInterface>(nullptr,TEXT("/Engine/EngineDebugMaterials/VertexColorMaterial.VertexColorMaterial"));
    if(VertexMat)Mesh->SetMaterial(0,VertexMat);
    GeneratedMeshes.Add(Mesh);
}
