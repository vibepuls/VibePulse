#include "DhakaCityGenerator.h"
#include "ProceduralMeshComponent.h"
#include "Materials/Material.h"
#include "Materials/MaterialInstanceDynamic.h"
#include "UObject/ConstructorHelpers.h"

ADhakaCityGenerator::ADhakaCityGenerator(){ PrimaryActorTick.bCanEverTick=false; SceneRoot=CreateDefaultSubobject<USceneComponent>(TEXT("SceneRoot")); SetRootComponent(SceneRoot); }
void ADhakaCityGenerator::ClearGenerated(){ for(auto* M:GeneratedMeshes){if(M){M->DestroyComponent();}} GeneratedMeshes.Reset(); }
void ADhakaCityGenerator::OnConstruction(const FTransform& Transform)
{
    Super::OnConstruction(Transform); ClearGenerated(); FRandomStream R(RandomSeed);
    const float Step=CityExtent/FMath::Max(4,GridBlocks); const float Start=-CityExtent*0.5f;
    AddBoxMesh(FVector(0,0,-90.f),FVector(CityExtent+20000.f,CityExtent+20000.f,100.f),FLinearColor(0.19f,0.27f,0.17f),true);
    constexpr float RiverCenterX=135000.f, RiverHalfWidth=9000.f;
    AddBoxMesh(FVector(RiverCenterX,0,-25.f),FVector(RiverHalfWidth*2.f,CityExtent+Step,16.f),FLinearColor(0.035f,0.25f,0.38f),false);
    AddBoxMesh(FVector(RiverCenterX-RiverHalfWidth-180.f,0,-5.f),FVector(360.f,CityExtent+Step,35.f),FLinearColor(0.42f,0.34f,0.23f),false);
    AddBoxMesh(FVector(RiverCenterX+RiverHalfWidth+180.f,0,-5.f),FVector(360.f,CityExtent+Step,35.f),FLinearColor(0.42f,0.34f,0.23f),false);
    // Low-poly passenger boats and river launches.
    for(int32 Boat=0;Boat<4;++Boat){const float Y=-105000.f+Boat*68000.f;const FLinearColor Hull=Boat%2?FLinearColor(.76f,.19f,.1f):FLinearColor(.1f,.28f,.36f);AddBoxMesh(FVector(RiverCenterX,Y,35.f),FVector(1500.f,420.f,100.f),Hull,false);AddBoxMesh(FVector(RiverCenterX-120.f,Y,125.f),FVector(620.f,300.f,150.f),FLinearColor(.86f,.82f,.69f),false);AddBoxMesh(FVector(RiverCenterX-120.f,Y,205.f),FVector(640.f,320.f,18.f),FLinearColor(.13f,.16f,.18f),false);}
    if(bGenerateRoads){
        for(int32 I=0;I<=GridBlocks;++I){
            const float P=Start+I*Step;
            const bool bRiverRoad=P>RiverCenterX-RiverHalfWidth && P<RiverCenterX+RiverHalfWidth;
            if(!bRiverRoad){
                AddBoxMesh(FVector(P,0,0),FVector(900.f,CityExtent+Step,18.f),FLinearColor(0.075f,0.085f,0.09f),true);
                AddBoxMesh(FVector(P,0,10.f),FVector(1.5f,CityExtent+Step,1.f),FLinearColor(0.82f,0.72f,0.43f),false);
                for(float Side : {-1.f,1.f})
                {
                    AddBoxMesh(FVector(P+Side*660.f,0,12.f),FVector(300.f,CityExtent+Step,22.f),FLinearColor(0.43f,0.42f,0.38f),true);
                    AddBoxMesh(FVector(P+Side*495.f,0,23.f),FVector(24.f,CityExtent+Step,28.f),FLinearColor(0.57f,0.54f,0.46f),true);
                }
            }
            AddBoxMesh(FVector(0,P,0),FVector(CityExtent+Step,900.f,18.f),FLinearColor(0.075f,0.085f,0.09f),true);
            AddBoxMesh(FVector(0,P,10.f),FVector(CityExtent+Step,1.5f,1.f),FLinearColor(0.82f,0.72f,0.43f),false);
            for(float Side : {-1.f,1.f})
            {
                AddBoxMesh(FVector(0,P+Side*660.f,12.f),FVector(CityExtent+Step,300.f,22.f),FLinearColor(0.43f,0.42f,0.38f),true);
                AddBoxMesh(FVector(0,P+Side*495.f,23.f),FVector(CityExtent+Step,24.f,28.f),FLinearColor(0.57f,0.54f,0.46f),true);
            }
            if(I%4==0)for(float Side : {-1.f,1.f})AddBoxMesh(FVector(RiverCenterX,P+Side*520.f,125.f),FVector(RiverHalfWidth*2.f,22.f,80.f),FLinearColor(.65f,.68f,.67f),true);
            // Drainage channels along selected curb lines, kept sparse to control component count.
            if(I%3==0)for(float Side : {-1.f,1.f})
            {
                if(!bRiverRoad)AddBoxMesh(FVector(P+Side*825.f,0.f,8.f),FVector(38.f,CityExtent+Step,5.f),FLinearColor(.035f,.045f,.048f),false);
                AddBoxMesh(FVector(0.f,P+Side*825.f,8.f),FVector(CityExtent+Step,38.f,5.f),FLinearColor(.035f,.045f,.048f),false);
            }
        }
    }
    if(bGenerateRoads)
    {
        // Zebra crossings at selected central intersections.
        for(const int32 IX : {7,9,11})for(const int32 IY : {7,9,11})
        {
            const float CrossX=Start+IX*Step, CrossY=Start+IY*Step;
            if(CrossX>RiverCenterX-RiverHalfWidth&&CrossX<RiverCenterX+RiverHalfWidth)continue;
            for(int32 Stripe=0;Stripe<8;++Stripe)
            {
                const float Offset=-280.f+Stripe*80.f;
                AddBoxMesh(FVector(CrossX+Offset,CrossY-430.f,14.f),FVector(48.f,760.f,2.f),FLinearColor(.88f,.88f,.82f),false);
                AddBoxMesh(FVector(CrossX+Offset,CrossY+430.f,14.f),FVector(48.f,760.f,2.f),FLinearColor(.88f,.88f,.82f),false);
                AddBoxMesh(FVector(CrossX-430.f,CrossY+Offset,14.f),FVector(760.f,48.f,2.f),FLinearColor(.88f,.88f,.82f),false);
                AddBoxMesh(FVector(CrossX+430.f,CrossY+Offset,14.f),FVector(760.f,48.f,2.f),FLinearColor(.88f,.88f,.82f),false);
            }
        }
        // Random asphalt patches and pothole silhouettes provide low-cost road-surface variation.
        for(int32 Damage=0;Damage<GridBlocks*3;++Damage)
        {
            const int32 RoadIndex=R.RandRange(0,GridBlocks);
            const float RoadP=Start+RoadIndex*Step;
            const float Along=R.FRandRange(Start,-Start);
            const bool bVertical=R.RandBool();
            const float W=R.FRandRange(45.f,150.f),D=R.FRandRange(55.f,180.f);
            if(bVertical && !(RoadP>RiverCenterX-RiverHalfWidth&&RoadP<RiverCenterX+RiverHalfWidth))
                AddBoxMesh(FVector(RoadP,Along,10.f),FVector(W,D,2.f),R.FRand()<.5f?FLinearColor(.045f,.05f,.052f):FLinearColor(.12f,.125f,.12f),false);
            else if(!bVertical)
                AddBoxMesh(FVector(Along,RoadP,10.f),FVector(D,W,2.f),R.FRand()<.5f?FLinearColor(.045f,.05f,.052f):FLinearColor(.12f,.125f,.12f),false);
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
    if(VertexColorMaterial)Mesh->SetMaterial(0,VertexColorMaterial);
    else if(UMaterialInterface* Base=LoadObject<UMaterialInterface>(nullptr,TEXT("/Engine/BasicShapes/BasicShapeMaterial.BasicShapeMaterial"))){UMaterialInstanceDynamic* Tint=UMaterialInstanceDynamic::Create(Base,this);Tint->SetVectorParameterValue(TEXT("BaseColor"),Color);Mesh->SetMaterial(0,Tint);}
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
    if(VertexColorMaterial)Mesh->SetMaterial(0,VertexColorMaterial);
    else if(UMaterialInterface* Base=LoadObject<UMaterialInterface>(nullptr,TEXT("/Engine/BasicShapes/BasicShapeMaterial.BasicShapeMaterial"))){UMaterialInstanceDynamic* Tint=UMaterialInstanceDynamic::Create(Base,this);Tint->SetVectorParameterValue(TEXT("BaseColor"),Color);Mesh->SetMaterial(0,Tint);}
    GeneratedMeshes.Add(Mesh);
}
