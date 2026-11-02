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
    const int32 Rows=FMath::Clamp(Floors,2,18);
    for(int32 Row=0;Row<Rows;++Row)
    {
        const float Z=H*(Row+.5f)/Rows;
        const int32 Cols=FMath::Clamp(FMath::FloorToInt(W/110.f),2,8);
        for(int32 Col=0;Col<Cols;++Col)
        {
            const float X=-W*.5f+(Col+.5f)*W/Cols;
            Box(TEXT("District_Tower_Window"),P+FVector(X,-D*.5f-2.f,Z),FVector(FMath::Min(35.f,W/Cols*.45f),2.f,FMath::Min(28.f,H/Rows*.45f)),Glass);
            Box(TEXT("District_Tower_Window"),P+FVector(X,D*.5f+2.f,Z),FVector(FMath::Min(35.f,W/Cols*.45f),2.f,FMath::Min(28.f,H/Rows*.45f)),Glass);
        }
    }
}
void ADhakaLandmarkGenerator::BuildOldDhaka()
{
    const FVector P(-88000.f,103000.f,0.f);
    const FLinearColor Brick(.49f,.22f,.13f),Sand(.72f,.59f,.39f),Gate(.35f,.17f,.11f);
    // Lalbagh Fort-inspired walled courtyard and monumental entrance.
    Wall(P+FVector(0,-900,180),FVector(1900,70,360),Brick);
    Wall(P+FVector(0,900,180),FVector(1900,70,360),Brick);
    Wall(P+FVector(-950,0,180),FVector(70,1800,360),Brick);
    Wall(P+FVector(950,0,180),FVector(70,1800,360),Brick);
    Box(TEXT("Lalbagh_Gate_Left"),P+FVector(-210,-900,190),FVector(180,90,380),Gate);
    Box(TEXT("Lalbagh_Gate_Right"),P+FVector(210,-900,190),FVector(180,90,380),Gate);
    Box(TEXT("Lalbagh_Gate_Lintel"),P+FVector(0,-900,370),FVector(600,100,80),Sand);
    Box(TEXT("Lalbagh_Central_Pavilion"),P+FVector(0,0,150),FVector(600,480,300),Sand);
    Box(TEXT("Lalbagh_Dome"),P+FVector(0,0,345),FVector(280,280,110),FLinearColor(.68f,.57f,.40f));
    // Old Dhaka bazaar blocks with narrow frontage and awnings.
    for(int32 I=0;I<12;++I)
    {
        const float X=-2600.f+(I%6)*850.f,Y=2600.f+(I/6)*650.f;
        Box(TEXT("OldDhaka_MarketShop"),P+FVector(X,Y,120),FVector(650,480,240),I%2?FLinearColor(.43f,.24f,.15f):FLinearColor(.57f,.33f,.18f));
        Box(TEXT("OldDhaka_ShopAwning"),P+FVector(X,Y-260.f,190),FVector(680,90,25),I%2?FLinearColor(.65f,.09f,.05f):FLinearColor(.04f,.34f,.20f));
    }
}
void ADhakaLandmarkGenerator::BuildModernDhaka(FRandomStream& R)
{
    // Gulshan/Banani: glass towers and office campuses.
    for(int32 I=0;I<12;++I)
    {
        const float X=-65000.f+(I%4)*1400.f,Y=-52000.f+(I/4)*1700.f;
        Tower(FVector(X,Y,0),R.FRandRange(550.f,900.f),R.FRandRange(500.f,800.f),R.FRandRange(1500.f,5200.f),R.FRandRange(0.f,1.f)>.5f?FLinearColor(.56f,.58f,.57f):FLinearColor(.37f,.43f,.46f),R.RandRange(6,18));
    }
    // Motijheel office cluster.
    for(int32 I=0;I<8;++I)Tower(FVector(24000.f+(I%4)*1300.f,18000.f+(I/4)*1500.f,0),650,600,R.FRandRange(1700.f,4200.f),FLinearColor(.58f,.53f,.44f),R.RandRange(7,16));
    // Farmgate-inspired flyover deck and piers.
    Box(TEXT("Farmgate_Flyover_Deck"),FVector(0,-16000.f,900.f),FVector(38000.f,900.f,110.f),FLinearColor(.37f,.37f,.35f));
    for(int32 I=0;I<16;++I)Box(TEXT("Farmgate_Flyover_Pier"),FVector(-17500.f+I*2300.f,-16000.f,430.f),FVector(180.f,180.f,900.f),FLinearColor(.43f,.43f,.40f));
    // Dhanmondi lake and park paths.
    Box(TEXT("Dhanmondi_Lake"),FVector(-42000.f,18000.f,-4.f),FVector(7500.f,15000.f,8.f),FLinearColor(.04f,.23f,.31f));
    for(int32 I=0;I<18;++I)Box(TEXT("Dhanmondi_Park_Path"),FVector(-46000.f+I*450.f,10000.f,12.f),FVector(260.f,15000.f,12.f),FLinearColor(.43f,.39f,.31f));
    // Uttara/Mirpur residential blocks and shop fronts.
    for(int32 I=0;I<24;++I)
    {
        const float X=60000.f+(I%6)*950.f,Y=-50000.f+(I/6)*1100.f,H=R.FRandRange(500.f,1500.f);
        Box(TEXT("Uttara_ResidentialBlock"),FVector(X,Y,H*.5f),FVector(760.f,780.f,H),FLinearColor(.59f,.54f,.45f));
        Box(TEXT("Uttara_BalconyBand"),FVector(X,Y-400.f,H*.65f),FVector(780.f,18.f,30.f),FLinearColor(.32f,.34f,.34f));
    }
}
void ADhakaLandmarkGenerator::BuildRiverfront()
{
    const FVector P(130000.f,145000.f,0.f);
    // Sadarghat-style terminal, mooring platforms, and launch silhouettes.
    Box(TEXT("Sadarghat_Terminal"),P+FVector(-2600.f,0,220.f),FVector(1600.f,1100.f,440.f),FLinearColor(.55f,.43f,.30f));
    Box(TEXT("Sadarghat_Pier"),P+FVector(0,0,20.f),FVector(11000.f,700.f,40.f),FLinearColor(.39f,.32f,.24f));
    for(int32 I=0;I<6;++I)
    {
        const float Y=-3000.f+I*1200.f;
        Box(TEXT("RiverLaunch_Hull"),P+FVector(3000.f,Y,60.f),FVector(1600.f,430.f,100.f),I%2?FLinearColor(.70f,.12f,.08f):FLinearColor(.09f,.29f,.36f));
        Box(TEXT("RiverLaunch_Deck"),P+FVector(2950.f,Y,135.f),FVector(900.f,350.f,130.f),FLinearColor(.78f,.73f,.61f));
        Box(TEXT("RiverLaunch_Roof"),P+FVector(2950.f,Y,210.f),FVector(1000.f,370.f,20.f),FLinearColor(.12f,.15f,.17f));
    }
}
