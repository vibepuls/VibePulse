#include "DhakaTrafficVehicle.h"
#include "Components/StaticMeshComponent.h"
#include "Components/BoxComponent.h"
#include "Components/SceneComponent.h"
#include "Materials/MaterialInstanceDynamic.h"
#include "Engine/World.h"
#include "EngineUtils.h"
#include "UObject/ConstructorHelpers.h"
#include "DhakaVehiclePawn.h"
#include "DhakaTrafficSignal.h"

ADhakaTrafficVehicle::ADhakaTrafficVehicle()
{
    PrimaryActorTick.bCanEverTick=true;
    TrafficRoot=CreateDefaultSubobject<UBoxComponent>(TEXT("TrafficRoot")); SetRootComponent(TrafficRoot);
    TrafficRoot->SetBoxExtent(FVector(205.f,100.f,55.f)); TrafficRoot->SetCollisionProfileName(TEXT("BlockAll")); TrafficRoot->SetSimulatePhysics(false);
    Body=CreateDefaultSubobject<UStaticMeshComponent>(TEXT("TrafficBody")); Body->SetupAttachment(TrafficRoot);
    static ConstructorHelpers::FObjectFinder<UStaticMesh> Cube(TEXT("/Engine/BasicShapes/Cube.Cube"));
    if(Cube.Succeeded()) Body->SetStaticMesh(Cube.Object);
    Body->SetRelativeScale3D(FVector(4.1f,2.0f,1.1f)); Body->SetCollisionEnabled(ECollisionEnabled::NoCollision);
    if(UMaterialInterface* BaseMaterial=LoadObject<UMaterialInterface>(nullptr,TEXT("/Engine/BasicShapes/BasicShapeMaterial.BasicShapeMaterial"))) Body->SetMaterial(0,BaseMaterial);
    static ConstructorHelpers::FObjectFinder<UStaticMesh> Cylinder(TEXT("/Engine/BasicShapes/Cylinder.Cylinder"));
    auto MakeWheel=[this](const TCHAR* Name)->UStaticMeshComponent* {
        UStaticMeshComponent* Wheel=CreateDefaultSubobject<UStaticMeshComponent>(Name);
        if(Cylinder.Succeeded()) Wheel->SetStaticMesh(Cylinder.Object);
        Wheel->SetupAttachment(TrafficRoot); Wheel->SetCollisionEnabled(ECollisionEnabled::NoCollision);
        Wheel->SetRelativeRotation(FRotator(90.f,0.f,0.f)); Wheel->SetRelativeScale3D(FVector(.34f,.18f,.34f));
        return Wheel;
    };
    WheelFrontLeft=MakeWheel(TEXT("WheelFrontLeft")); WheelFrontRight=MakeWheel(TEXT("WheelFrontRight"));
    WheelRearLeft=MakeWheel(TEXT("WheelRearLeft")); WheelRearRight=MakeWheel(TEXT("WheelRearRight"));
    EmergencyLightRed=CreateDefaultSubobject<UStaticMeshComponent>(TEXT("EmergencyLightRed")); EmergencyLightRed->SetupAttachment(TrafficRoot); if(Cube.Succeeded())EmergencyLightRed->SetStaticMesh(Cube.Object); EmergencyLightRed->SetRelativeLocation(FVector(0,-28,Dimensions.Z*50.f+24.f)); EmergencyLightRed->SetRelativeScale3D(FVector(.32f,.28f,.12f)); EmergencyLightRed->SetCollisionEnabled(ECollisionEnabled::NoCollision);
    EmergencyLightBlue=CreateDefaultSubobject<UStaticMeshComponent>(TEXT("EmergencyLightBlue")); EmergencyLightBlue->SetupAttachment(TrafficRoot); if(Cube.Succeeded())EmergencyLightBlue->SetStaticMesh(Cube.Object); EmergencyLightBlue->SetRelativeLocation(FVector(0,28,Dimensions.Z*50.f+24.f)); EmergencyLightBlue->SetRelativeScale3D(FVector(.32f,.28f,.12f)); EmergencyLightBlue->SetCollisionEnabled(ECollisionEnabled::NoCollision);
    if(UMaterialInterface* Base=LoadObject<UMaterialInterface>(nullptr,TEXT("/Engine/BasicShapes/BasicShapeMaterial.BasicShapeMaterial"))){if(UMaterialInstanceDynamic* Red=UMaterialInstanceDynamic::Create(Base,this)){Red->SetVectorParameterValue(TEXT("BaseColor"),FLinearColor(1.f,.01f,.015f));Red->SetScalarParameterValue(TEXT("EmissiveStrength"),4.f);EmergencyLightRed->SetMaterial(0,Red);}if(UMaterialInstanceDynamic* Blue=UMaterialInstanceDynamic::Create(Base,this)){Blue->SetVectorParameterValue(TEXT("BaseColor"),FLinearColor(.01f,.08f,1.f));Blue->SetScalarParameterValue(TEXT("EmissiveStrength"),4.f);EmergencyLightBlue->SetMaterial(0,Blue);}}
    EmergencyLightRed->SetVisibility(false,true); EmergencyLightBlue->SetVisibility(false,true);
    RouteDirection=FVector(1,0,0);
}
void ADhakaTrafficVehicle::ConfigureVehicleType(EDhakaTrafficVehicleType NewType)
{
    VehicleType=NewType;
    FVector Dimensions(4.1f,2.0f,1.1f);
    FLinearColor Paint(.12f,.28f,.62f,1.f);
    switch(VehicleType)
    {
        case EDhakaTrafficVehicleType::Bus: Dimensions=FVector(7.2f,2.55f,1.8f); Paint=FLinearColor(.8f,.58f,.12f); CruiseSpeed=520.f; BrakeDistance=1000.f; break;
        case EDhakaTrafficVehicleType::Truck: Dimensions=FVector(5.8f,2.45f,1.55f); Paint=FLinearColor(.18f,.42f,.22f); CruiseSpeed=480.f; BrakeDistance=950.f; break;
        case EDhakaTrafficVehicleType::CNG: Dimensions=FVector(2.25f,1.35f,1.25f); Paint=FLinearColor(.08f,.58f,.32f); CruiseSpeed=430.f; BrakeDistance=520.f; break;
        case EDhakaTrafficVehicleType::Motorcycle: Dimensions=FVector(1.25f,.62f,.68f); Paint=FLinearColor(.12f,.12f,.14f); CruiseSpeed=850.f; BrakeDistance=420.f; break;
        case EDhakaTrafficVehicleType::Rickshaw: Dimensions=FVector(1.75f,1.15f,1.f); Paint=FLinearColor(.88f,.24f,.12f); CruiseSpeed=300.f; BrakeDistance=380.f; break;
        case EDhakaTrafficVehicleType::Emergency: Dimensions=FVector(4.3f,2.f,1.15f); Paint=FLinearColor(.82f,.08f,.06f); CruiseSpeed=900.f; BrakeDistance=850.f; break;
        default: break;
    }
    Body->SetRelativeScale3D(Dimensions);
    TrafficRoot->SetBoxExtent(FVector(Dimensions.X*50.f,Dimensions.Y*50.f,Dimensions.Z*50.f));
    if(UMaterialInterface* BaseMaterial=Body->GetMaterial(0))
    {
        UMaterialInstanceDynamic* DynamicMaterial=UMaterialInstanceDynamic::Create(BaseMaterial,this);
        if(DynamicMaterial)
        {
            DynamicMaterial->SetVectorParameterValue(TEXT("Color"),Paint);
            DynamicMaterial->SetVectorParameterValue(TEXT("BaseColor"),Paint);
            Body->SetMaterial(0,DynamicMaterial);
        }
    }
    const float HalfX=Dimensions.X*50.f*.72f, HalfY=Dimensions.Y*50.f*.88f, WheelZ=-Dimensions.Z*50.f*.78f;
    if(WheelFrontLeft)WheelFrontLeft->SetRelativeLocation(FVector(HalfX,-HalfY,WheelZ));
    if(WheelFrontRight)WheelFrontRight->SetRelativeLocation(FVector(HalfX,HalfY,WheelZ));
    if(WheelRearLeft)WheelRearLeft->SetRelativeLocation(FVector(-HalfX,-HalfY,WheelZ));
    if(WheelRearRight)WheelRearRight->SetRelativeLocation(FVector(-HalfX,HalfY,WheelZ));
    if(EmergencyLightRed)EmergencyLightRed->SetRelativeLocation(FVector(0,-Dimensions.Y*34.f,Dimensions.Z*50.f+24.f));
    if(EmergencyLightBlue)EmergencyLightBlue->SetRelativeLocation(FVector(0,Dimensions.Y*34.f,Dimensions.Z*50.f+24.f));
    if(EmergencyLightRed)EmergencyLightRed->SetVisibility(VehicleType==EDhakaTrafficVehicleType::Emergency,true);
    if(EmergencyLightBlue)EmergencyLightBlue->SetVisibility(VehicleType==EDhakaTrafficVehicleType::Emergency,true);
    const bool bMotorcycle=VehicleType==EDhakaTrafficVehicleType::Motorcycle;
    if(WheelFrontLeft)WheelFrontLeft->SetVisibility(!bMotorcycle);
    if(WheelRearLeft)WheelRearLeft->SetVisibility(!bMotorcycle);
    if(bMotorcycle)
    {
        if(WheelFrontRight)WheelFrontRight->SetRelativeLocation(FVector(HalfX,0.f,WheelZ));
        if(WheelRearRight)WheelRearRight->SetRelativeLocation(FVector(-HalfX,0.f,WheelZ));
    }
}
void ADhakaTrafficVehicle::BeginPlay(){Super::BeginPlay();RouteDirection=RouteDirection.GetSafeNormal();if(RouteDirection.IsNearlyZero())RouteDirection=FVector(1,0,0);if(!FMath::IsNearlyZero(LaneOffset))SetActorLocation(GetActorLocation()+FVector(-RouteDirection.Y,RouteDirection.X,0.f)*LaneOffset);CurrentSpeed=CruiseSpeed*0.55f;}
void ADhakaTrafficVehicle::Tick(float Dt)
{
    Super::Tick(Dt);
    if(!GetWorld()||Dt<=0.f)return;
    if(VehicleType==EDhakaTrafficVehicleType::Emergency){EmergencyLightTimer-=Dt;if(EmergencyLightTimer<=0.f){EmergencyLightTimer=.22f;bEmergencyLightPhase=!bEmergencyLightPhase;if(EmergencyLightRed)EmergencyLightRed->SetVisibility(bEmergencyLightPhase,true);if(EmergencyLightBlue)EmergencyLightBlue->SetVisibility(!bEmergencyLightPhase,true);}}
    AIUpdateTimer-=Dt;
    if(AIUpdateTimer<=0.f)
    {
        AIUpdateTimer=.30f;
        bRedSignalAhead=false;
        CachedFollowingSpeedLimit=CruiseSpeed;
        const FVector Direction=RouteDirection.GetSafeNormal2D();
        for(TActorIterator<ADhakaTrafficVehicle> It(GetWorld());It;++It)
        {
            ADhakaTrafficVehicle* Other=*It;
            if(!Other||Other==this)continue;
            const FVector Delta=Other->GetActorLocation()-GetActorLocation();
            const float Ahead=FVector::DotProduct(Delta,Direction);
            const float Side=FMath::Abs(FVector::CrossProduct(Delta,Direction).Z);
            if(Ahead>0.f&&Ahead<FMath::Max(BrakeDistance,700.f)&&Side<260.f)
            {
                const float Target=FMath::Clamp((Ahead-170.f)/FMath::Max(1.f,BrakeDistance-170.f),0.f,1.f);
                if(Target<.96f)CachedFollowingSpeedLimit=FMath::Min(CachedFollowingSpeedLimit,CruiseSpeed*Target);
            }
        }
        for(TActorIterator<ADhakaTrafficSignal> It(GetWorld());It;++It)
        {
            ADhakaTrafficSignal* Signal=*It;
            if(!Signal)continue;
            const FVector Delta=Signal->GetActorLocation()-GetActorLocation();
            const float Ahead=FVector::DotProduct(Delta,Direction);
            const float Side=FMath::Abs(FVector::CrossProduct(Delta,Direction).Z);
            if(Ahead>-150.f&&Ahead<BrakeDistance+250.f&&Side<650.f&&Signal->IsRedForDirection(Direction))
            { bRedSignalAhead=true;break; }
        }
        if(bAllowTurns&&!bRedSignalAhead)
        {
            const FVector Position=GetActorLocation();
            constexpr float GridStart=-160000.f;
            constexpr float GridStep=320000.f/18.f;
            const int32 IX=FMath::RoundToInt((Position.X-GridStart)/GridStep);
            const int32 IY=FMath::RoundToInt((Position.Y-GridStart)/GridStep);
            const float RoadX=GridStart+IX*GridStep;
            const float RoadY=GridStart+IY*GridStep;
            if(IX>=0&&IX<=18&&IY>=0&&IY<=18&&FMath::Abs(Position.X-RoadX)<320.f&&FMath::Abs(Position.Y-RoadY)<320.f)
            {
                const int64 IntersectionKey=static_cast<int64>(IX)*100+IY;
                if(IntersectionKey!=LastIntersectionKey)
                {
                    LastIntersectionKey=IntersectionKey;
                    if(FMath::FRand()<FMath::Clamp(TurnChance,0.f,1.f))
                    {
                        const bool bTurnLeft=FMath::RandBool();
                        if(FMath::Abs(Direction.X)>0.5f)
                            RouteDirection=FVector(0,bTurnLeft?Direction.X:-Direction.X,0);
                        else
                            RouteDirection=FVector(bTurnLeft?-Direction.Y:Direction.Y,0,0);
                        RouteDirection=RouteDirection.GetSafeNormal2D();
                        SetActorRotation(RouteDirection.Rotation());
                        const FVector SnappedLocation=FVector(RoadX,RoadY,GetActorLocation().Z)+FVector(-RouteDirection.Y,RouteDirection.X,0.f)*LaneOffset;
                        SetActorLocation(SnappedLocation,false,nullptr,ETeleportType::TeleportPhysics);
                    }
                }
            }
        }
    }
    float Desired=FMath::Min(CruiseSpeed,CachedFollowingSpeedLimit);
    if(bRedSignalAhead)Desired=0.f;
    if(bYieldToPlayer)
    {
        for(TActorIterator<ADhakaVehiclePawn> It(GetWorld());It;++It)
        {
            const FVector Delta=It->GetActorLocation()-GetActorLocation();
            const float Ahead=FVector::DotProduct(Delta,RouteDirection);
            const float Side=FMath::Abs(FVector::CrossProduct(Delta,RouteDirection).Z);
            if(Ahead>0.f&&Ahead<BrakeDistance&&Side<260.f)
                Desired=FMath::Min(Desired,CruiseSpeed*FMath::Clamp((Ahead-140.f)/FMath::Max(1.f,BrakeDistance-140.f),0.f,1.f));
        }
    }
    CurrentSpeed=FMath::FInterpTo(CurrentSpeed,Desired,Dt,Desired<CurrentSpeed?3.8f:1.5f);
    const float WheelDegrees=FMath::RadiansToDegrees(CurrentSpeed*Dt/17.f);
    for(UStaticMeshComponent* Wheel : {WheelFrontLeft.Get(),WheelFrontRight.Get(),WheelRearLeft.Get(),WheelRearRight.Get()})
        if(Wheel && Wheel->IsVisible()) Wheel->AddLocalRotation(FRotator(0.f,0.f,WheelDegrees));
    AddActorWorldOffset(RouteDirection.GetSafeNormal2D()*CurrentSpeed*Dt,true);
    SetActorRotation(FMath::RInterpTo(GetActorRotation(),RouteDirection.GetSafeNormal2D().Rotation(),Dt,2.f));
}
