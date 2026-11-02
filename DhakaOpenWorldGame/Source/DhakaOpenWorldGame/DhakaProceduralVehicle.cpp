#include "DhakaProceduralVehicle.h"
#include "ProceduralMeshComponent.h"
#include "Components/StaticMeshComponent.h"
#include "Materials/MaterialInstanceDynamic.h"
#include "UObject/ConstructorHelpers.h"

ADhakaProceduralVehicle::ADhakaProceduralVehicle()
{
    PrimaryActorTick.bCanEverTick = false;
    SceneRoot = CreateDefaultSubobject<USceneComponent>(TEXT("SceneRoot"));
    SetRootComponent(SceneRoot);
    BodyMesh = CreateDefaultSubobject<UProceduralMeshComponent>(TEXT("GeneratedBodyShell"));
    BodyMesh->SetupAttachment(SceneRoot);
    BodyMesh->bUseAsyncCooking = true;
}

void ADhakaProceduralVehicle::OnConstruction(const FTransform& Transform)
{
    Super::OnConstruction(Transform);
    RegenerateVehicle();
}

void ADhakaProceduralVehicle::RegenerateVehicle()
{
    for (UActorComponent* Part : GeneratedParts)
    {
        if (Part) Part->DestroyComponent();
    }
    GeneratedParts.Reset();
    if (BodyMesh) BodyMesh->ClearAllMeshSections();

    const bool bLarge = VehicleKind == EDhakaVehicleKind::CityBus || VehicleKind == EDhakaVehicleKind::Coach ||
        VehicleKind == EDhakaVehicleKind::SchoolBus || VehicleKind == EDhakaVehicleKind::Minibus ||
        VehicleKind == EDhakaVehicleKind::Microbus;
    const bool bTwoWheeler = VehicleKind == EDhakaVehicleKind::Motorcycle ||
        VehicleKind == EDhakaVehicleKind::Scooter || VehicleKind == EDhakaVehicleKind::Bicycle;
    if (bLarge) { Length = FMath::Max(Length, 680.f); Width = FMath::Max(Width, 225.f); BodyHeight = FMath::Max(BodyHeight, 190.f); CabinHeight = FMath::Max(CabinHeight, 105.f); }
    if (bTwoWheeler) { Length = FMath::Min(Length, 245.f); Width = FMath::Min(Width, 90.f); BodyHeight = FMath::Min(BodyHeight, 75.f); }
    if (VehicleKind == EDhakaVehicleKind::CNG || VehicleKind == EDhakaVehicleKind::CycleRickshaw ||
        VehicleKind == EDhakaVehicleKind::BatteryRickshaw || VehicleKind == EDhakaVehicleKind::HandCart)
    { Length = FMath::Min(Length, 300.f); Width = FMath::Min(Width, 165.f); }

    UMaterialInterface* Base = LoadObject<UMaterialInterface>(nullptr, TEXT("/Engine/BasicShapes/BasicShapeMaterial.BasicShapeMaterial"));
    PaintMaterial = Base ? UMaterialInstanceDynamic::Create(Base, this) : nullptr;
    GlassMaterial = Base ? UMaterialInstanceDynamic::Create(Base, this) : nullptr;
    DarkMaterial = Base ? UMaterialInstanceDynamic::Create(Base, this) : nullptr;
    if (PaintMaterial) PaintMaterial->SetVectorParameterValue(TEXT("BaseColor"), Paint);
    if (GlassMaterial) { GlassMaterial->SetVectorParameterValue(TEXT("BaseColor"), GlassTint); GlassMaterial->SetScalarParameterValue(TEXT("Roughness"), .18f); }
    if (DarkMaterial) DarkMaterial->SetVectorParameterValue(TEXT("BaseColor"), FLinearColor(.035f,.045f,.05f,1.f));

    BuildBodyShell();
    BuildGlazing();
    BuildWheelsAndTrim();
    if (bGenerateInterior) BuildInterior();
}

void ADhakaProceduralVehicle::BuildBodyShell()
{
    // Longitudinal stations form a tapered body shell rather than a single box.
    const float HalfL = Length * .5f, HalfW = Width * .5f;
    struct FStation { float X, W, Bottom, Shoulder, Roof; };
    const TArray<FStation> Stations = {
        {-HalfL, HalfW*.72f, 8.f, BodyHeight*.62f, BodyHeight*.72f},
        {-HalfL*.78f, HalfW*.94f, 4.f, BodyHeight*.94f, BodyHeight*.78f},
        {-HalfL*.30f, HalfW, 4.f, BodyHeight, BodyHeight*.84f},
        { HalfL*.28f, HalfW*.98f, 4.f, BodyHeight*.98f, BodyHeight*.82f},
        { HalfL*.78f, HalfW*.88f, 7.f, BodyHeight*.84f, BodyHeight*.70f},
        { HalfL, HalfW*.68f, 12.f, BodyHeight*.58f, BodyHeight*.58f}
    };
    TArray<FVector> V; TArray<int32> T; TArray<FVector2D> UV; TArray<FColor> C;
    TArray<FProcMeshTangent> Tangents; TArray<FVector> N;
    const int32 RingCount = 8;
    for (int32 S=0; S<Stations.Num(); ++S)
    {
        const FStation& P=Stations[S];
        const FVector Ring[RingCount] = {
            FVector(P.X,-P.W,P.Bottom), FVector(P.X,P.W,P.Bottom),
            FVector(P.X,P.W,P.Shoulder), FVector(P.X,P.W*.64f,P.Roof),
            FVector(P.X,-P.W*.64f,P.Roof), FVector(P.X,-P.W,P.Shoulder),
            FVector(P.X,-P.W*.78f,(P.Bottom+P.Shoulder)*.5f),
            FVector(P.X,P.W*.78f,(P.Bottom+P.Shoulder)*.5f)
        };
        for(int32 R=0;R<RingCount;++R){ V.Add(Ring[R]); UV.Add(FVector2D(float(S)/float(Stations.Num()-1),float(R)/RingCount)); C.Add(Paint.ToFColor(true)); Tangents.Add(FProcMeshTangent(0,1,0)); N.Add(FVector::UpVector); }
    }
    for(int32 S=0;S<Stations.Num()-1;++S) for(int32 R=0;R<RingCount;++R)
    {
        const int32 A=S*RingCount+R, B=S*RingCount+(R+1)%RingCount, D=(S+1)*RingCount+R, E=(S+1)*RingCount+(R+1)%RingCount;
        T.Append({A,D,B,B,D,E});
    }
    BodyMesh->CreateMeshSection(0,V,T,N,UV,C,Tangents,true);
    if(PaintMaterial) BodyMesh->SetMaterial(0,PaintMaterial);
    BodyMesh->SetCollisionEnabled(ECollisionEnabled::QueryAndPhysics);
}

void ADhakaProceduralVehicle::BuildGlazing()
{
    static ConstructorHelpers::FObjectFinder<UStaticMesh> Cube(TEXT("/Engine/BasicShapes/Cube.Cube"));
    if(!Cube.Succeeded()) return;
    const bool bBus=VehicleKind==EDhakaVehicleKind::CityBus || VehicleKind==EDhakaVehicleKind::Coach ||
        VehicleKind==EDhakaVehicleKind::SchoolBus || VehicleKind==EDhakaVehicleKind::Minibus ||
        VehicleKind==EDhakaVehicleKind::Microbus;
    const float Y=Width*.5f+1.5f, Z=BodyHeight*.68f;
    auto Part=[&](const TCHAR* Name,FVector P,FVector S,FRotator R=FRotator::ZeroRotator)
    { AddPrimitivePart(Name,Cube.Object,P,S,R,GlassMaterial); };
    if(bBus)
    {
        Part(TEXT("FrontWindshield"),FVector(Length*.36f,0,BodyHeight*.8f),FVector(Length*.10f,Width*.78f, CabinHeight*.68f),FRotator(0,0,-8));
        Part(TEXT("RearWindshield"),FVector(-Length*.37f,0,BodyHeight*.8f),FVector(Length*.06f,Width*.76f,CabinHeight*.62f));
        const int32 Count=FMath::Clamp(FMath::FloorToInt(Length/105.f),4,10);
        for(int32 I=0;I<Count;++I)
        {
            const float X=-Length*.34f+(Length*.68f)*(float(I)/FMath::Max(1,Count-1));
            Part(*FString::Printf(TEXT("LeftPassengerWindow_%02d"),I),FVector(X,-Y,Z+CabinHeight*.26f),FVector(Length*.045f,3.f,CabinHeight*.36f));
            Part(*FString::Printf(TEXT("RightPassengerWindow_%02d"),I),FVector(X,Y,Z+CabinHeight*.26f),FVector(Length*.045f,3.f,CabinHeight*.36f));
        }
    }
    else if(VehicleKind!=EDhakaVehicleKind::Motorcycle && VehicleKind!=EDhakaVehicleKind::Scooter &&
            VehicleKind!=EDhakaVehicleKind::Bicycle && VehicleKind!=EDhakaVehicleKind::HandCart)
    {
        Part(TEXT("FrontWindshield"),FVector(Length*.19f,0,BodyHeight*.89f),FVector(Length*.25f,Width*.78f,BodyHeight*.035f),FRotator(0,0,-13));
        Part(TEXT("RearWindshield"),FVector(-Length*.24f,0,BodyHeight*.83f),FVector(Length*.16f,Width*.72f,BodyHeight*.03f),FRotator(0,0,10));
        for(int32 Side : {-1,1})
        {
            Part(Side<0?TEXT("DriverFrontSideGlass"):TEXT("PassengerFrontSideGlass"),FVector(Length*.01f,Side*Y,BodyHeight*.84f),FVector(Length*.23f,3.f,CabinHeight*.44f));
            Part(Side<0?TEXT("DriverRearSideGlass"):TEXT("PassengerRearSideGlass"),FVector(-Length*.19f,Side*Y,BodyHeight*.82f),FVector(Length*.17f,3.f,CabinHeight*.39f));
        }
    }
}

void ADhakaProceduralVehicle::BuildWheelsAndTrim()
{
    static ConstructorHelpers::FObjectFinder<UStaticMesh> Cylinder(TEXT("/Engine/BasicShapes/Cylinder.Cylinder"));
    static ConstructorHelpers::FObjectFinder<UStaticMesh> Cube(TEXT("/Engine/BasicShapes/Cube.Cube"));
    if(!Cylinder.Succeeded() || !Cube.Succeeded()) return;
    const bool bBoat=VehicleKind==EDhakaVehicleKind::PassengerBoat || VehicleKind==EDhakaVehicleKind::RiverLaunch;
    const bool bTwoWheeler=VehicleKind==EDhakaVehicleKind::Motorcycle || VehicleKind==EDhakaVehicleKind::Scooter || VehicleKind==EDhakaVehicleKind::Bicycle;
    auto Part=[&](const TCHAR* Name,UStaticMesh* Mesh,FVector P,FVector S,FRotator R,UMaterialInterface* M)
    { AddPrimitivePart(Name,Mesh,P,S,R,M); };
    if(!bBoat)
    {
        const int32 Axles=bTwoWheeler?2:2;
        for(int32 A=0;A<Axles;++A)
        {
            const float X=-Length*.31f+(Length*.62f)*(float(A)/float(Axles-1));
            for(int32 Side : {-1,1})
            {
                if(VehicleKind==EDhakaVehicleKind::CycleRickshaw && Side>0) continue;
                const float WheelR=bTwoWheeler?Width*.22f:BodyHeight*.25f;
                Part(*FString::Printf(TEXT("Tire_%d_%d"),A,Side),Cylinder,
                    FVector(X,Side*(Width*.5f+WheelR*.28f),WheelR*.8f),FVector(WheelR*.2f,WheelR,WheelR),
                    FRotator(0,0,90),DarkMaterial);
                Part(*FString::Printf(TEXT("Rim_%d_%d"),A,Side),Cylinder,
                    FVector(X,Side*(Width*.5f+WheelR*.29f),WheelR*.8f),FVector(WheelR*.22f,WheelR*.42f,WheelR*.42f),
                    FRotator(0,0,90),GlassMaterial);
            }
        }
    }
    if(bGenerateExteriorTrim)
    {
        Part(TEXT("FrontBumper"),Cube,FVector(Length*.49f,0,BodyHeight*.22f),FVector(Length*.035f,Width*.94f,BodyHeight*.12f),FRotator::ZeroRotator,DarkMaterial);
        Part(TEXT("RearBumper"),Cube,FVector(-Length*.49f,0,BodyHeight*.22f),FVector(Length*.035f,Width*.94f,BodyHeight*.12f),FRotator::ZeroRotator,DarkMaterial);
        Part(TEXT("FrontGrille"),Cube,FVector(Length*.496f,0,BodyHeight*.43f),FVector(Length*.009f,Width*.3f,BodyHeight*.19f),FRotator::ZeroRotator,DarkMaterial);
        for(int32 Side : {-1,1})
        {
            Part(Side<0?TEXT("Headlight_L"):TEXT("Headlight_R"),Cube,FVector(Length*.49f,Side*Width*.34f,BodyHeight*.48f),FVector(Length*.012f,Width*.13f,BodyHeight*.12f),FRotator::ZeroRotator,GlassMaterial);
            Part(Side<0?TEXT("Taillight_L"):TEXT("Taillight_R"),Cube,FVector(-Length*.49f,Side*Width*.36f,BodyHeight*.48f),FVector(Length*.012f,Width*.10f,BodyHeight*.14f),FRotator::ZeroRotator,PaintMaterial);
            Part(Side<0?TEXT("Mirror_L"):TEXT("Mirror_R"),Cube,FVector(Length*.16f,Side*Width*.59f,BodyHeight*.74f),FVector(Length*.045f,Width*.07f,BodyHeight*.07f),FRotator::ZeroRotator,DarkMaterial);
            Part(Side<0?TEXT("DoorHandle_L"):TEXT("DoorHandle_R"),Cube,FVector(-Length*.03f,Side*Width*.54f,BodyHeight*.56f),FVector(Length*.04f,Width*.018f,BodyHeight*.025f),FRotator::ZeroRotator,GlassMaterial);
        }
    }
}

void ADhakaProceduralVehicle::BuildInterior()
{
    static ConstructorHelpers::FObjectFinder<UStaticMesh> Cube(TEXT("/Engine/BasicShapes/Cube.Cube"));
    static ConstructorHelpers::FObjectFinder<UStaticMesh> Cylinder(TEXT("/Engine/BasicShapes/Cylinder.Cylinder"));
    if(!Cube.Succeeded()) return;
    auto Part=[&](const TCHAR* Name,UStaticMesh* Mesh,FVector P,FVector S,FRotator R=FRotator::ZeroRotator)
    { AddPrimitivePart(Name,Mesh,P,S,R,DarkMaterial); };
    const float Z=BodyHeight*.34f;
    Part(TEXT("Dashboard"),Cube.Object,FVector(Length*.18f,0,Z),FVector(Length*.08f,Width*.76f,BodyHeight*.13f));
    Part(TEXT("CenterConsole"),Cube.Object,FVector(Length*.01f,0,Z*.8f),FVector(Length*.26f,Width*.14f,BodyHeight*.08f));
    Part(TEXT("DriverSeatBase"),Cube.Object,FVector(-Length*.08f,-Width*.23f,Z*.72f),FVector(Length*.16f,Width*.17f,BodyHeight*.08f));
    Part(TEXT("DriverSeatBack"),Cube.Object,FVector(-Length*.18f,-Width*.23f,Z*.98f),FVector(Length*.055f,Width*.17f,BodyHeight*.28f));
    Part(TEXT("PassengerSeatBase"),Cube.Object,FVector(-Length*.08f,Width*.23f,Z*.72f),FVector(Length*.16f,Width*.17f,BodyHeight*.08f));
    Part(TEXT("PassengerSeatBack"),Cube.Object,FVector(-Length*.18f,Width*.23f,Z*.98f),FVector(Length*.055f,Width*.17f,BodyHeight*.28f));
    if(Cylinder.Succeeded())
    {
        Part(TEXT("SteeringWheel"),Cylinder.Object,FVector(Length*.16f,-Width*.23f,Z*1.12f),FVector(BodyHeight*.018f,BodyHeight*.12f,BodyHeight*.12f),FRotator(0,0,90));
        Part(TEXT("GearSelector"),Cylinder.Object,FVector(Length*.02f,-Width*.02f,Z*.98f),FVector(BodyHeight*.025f,BodyHeight*.025f,BodyHeight*.08f));
    }
}

UStaticMeshComponent* ADhakaProceduralVehicle::AddPrimitivePart(const TCHAR* Name, UStaticMesh* Mesh,
    const FVector& Location, const FVector& Scale, const FRotator& Rotation, UMaterialInterface* Material)
{
    UStaticMeshComponent* Part=NewObject<UStaticMeshComponent>(this,Name);
    if(!Part) return nullptr;
    Part->SetupAttachment(SceneRoot);
    Part->SetStaticMesh(Mesh);
    Part->SetRelativeLocation(Location);
    Part->SetRelativeScale3D(Scale);
    Part->SetRelativeRotation(Rotation);
    Part->SetCollisionEnabled(ECollisionEnabled::NoCollision);
    if(Material) Part->SetMaterial(0,Material);
    AddInstanceComponent(Part);
    Part->RegisterComponent();
    GeneratedParts.Add(Part);
    return Part;
}

void ADhakaProceduralVehicle::AddBoxSection(UProceduralMeshComponent* Target, const FVector& Center,
    const FVector& Size, const FLinearColor& Color, bool bCollision)
{
    if(!Target) return;
    const FVector H=Size*.5f;
    TArray<FVector> V={Center+FVector(-H.X,-H.Y,-H.Z),Center+FVector(H.X,-H.Y,-H.Z),Center+FVector(H.X,H.Y,-H.Z),Center+FVector(-H.X,H.Y,-H.Z),Center+FVector(-H.X,-H.Y,H.Z),Center+FVector(H.X,-H.Y,H.Z),Center+FVector(H.X,H.Y,H.Z),Center+FVector(-H.X,H.Y,H.Z)};
    TArray<int32> T={0,2,1,0,3,2,4,5,6,4,6,7,0,1,5,0,5,4,2,3,7,2,7,6,1,2,6,1,6,5,3,0,4,3,4,7};
    TArray<FVector2D> UV; TArray<FColor> C; TArray<FVector> N; TArray<FProcMeshTangent> Tangents;
    for(int32 I=0;I<8;++I){UV.Add(FVector2D((I==1||I==2||I==5||I==6)?1.f:0.f,I>=4?1.f:0.f));C.Add(Color.ToFColor(true));N.Add(FVector::UpVector);Tangents.Add(FProcMeshTangent(1,0,0));}
    Target->CreateMeshSection(Target->GetNumSections(),V,T,N,UV,C,Tangents,bCollision);
}
