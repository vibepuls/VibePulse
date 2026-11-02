#include "DhakaPedestrian.h"
#include "DhakaTrafficVehicle.h"
#include "Components/StaticMeshComponent.h"
#include "Components/SceneComponent.h"
#include "Components/CapsuleComponent.h"
#include "Engine/World.h"
#include "CollisionQueryParams.h"
#include "CollisionShape.h"
#include "Materials/MaterialInstanceDynamic.h"
#include "UObject/ConstructorHelpers.h"
#include "DhakaWeatherController.h"
#include "EngineUtils.h"
#include "Kismet/GameplayStatics.h"
#include "GameFramework/Pawn.h"

ADhakaPedestrian::ADhakaPedestrian()
{
    PrimaryActorTick.bCanEverTick=true;
    PrimaryActorTick.TickInterval=0.18f;
    CollisionCapsule=CreateDefaultSubobject<UCapsuleComponent>(TEXT("PedestrianCollision"));SetRootComponent(CollisionCapsule);CollisionCapsule->InitCapsuleSize(38.f,92.f);CollisionCapsule->SetCollisionProfileName(TEXT("Pawn"));CollisionCapsule->SetCollisionEnabled(ECollisionEnabled::QueryAndPhysics);
    Root=CreateDefaultSubobject<USceneComponent>(TEXT("VisualRoot"));Root->SetupAttachment(CollisionCapsule);Root->SetRelativeLocation(FVector(0,0,-92.f));
    static ConstructorHelpers::FObjectFinder<UStaticMesh> Cube(TEXT("/Engine/BasicShapes/Cube.Cube"));
    static ConstructorHelpers::FObjectFinder<UStaticMesh> Sphere(TEXT("/Engine/BasicShapes/Sphere.Sphere"));
    UMaterialInterface* Base=LoadObject<UMaterialInterface>(nullptr,TEXT("/Engine/BasicShapes/BasicShapeMaterial.BasicShapeMaterial"));
    UMaterialInstanceDynamic* Shirt=Base?UMaterialInstanceDynamic::Create(Base,this):nullptr;
    UMaterialInstanceDynamic* Skin=Base?UMaterialInstanceDynamic::Create(Base,this):nullptr;
    UMaterialInstanceDynamic* Pants=Base?UMaterialInstanceDynamic::Create(Base,this):nullptr;
    UMaterialInstanceDynamic* HairMat=Base?UMaterialInstanceDynamic::Create(Base,this):nullptr;
    UMaterialInstanceDynamic* EyeMat=Base?UMaterialInstanceDynamic::Create(Base,this):nullptr;
    UMaterialInstanceDynamic* ShoeMat=Base?UMaterialInstanceDynamic::Create(Base,this):nullptr;
    if(Shirt)Shirt->SetVectorParameterValue(TEXT("BaseColor"),FLinearColor(FMath::FRandRange(.08f,.75f),FMath::FRandRange(.08f,.75f),FMath::FRandRange(.08f,.75f),1.f));
    if(Skin)Skin->SetVectorParameterValue(TEXT("BaseColor"),FLinearColor(FMath::FRandRange(.35f,.7f),FMath::FRandRange(.2f,.46f),FMath::FRandRange(.12f,.28f),1.f));
    if(Pants)Pants->SetVectorParameterValue(TEXT("BaseColor"),FLinearColor(FMath::FRandRange(.04f,.2f),FMath::FRandRange(.05f,.22f),FMath::FRandRange(.07f,.25f),1.f));
    if(HairMat)HairMat->SetVectorParameterValue(TEXT("BaseColor"),FLinearColor(.035f,.028f,.022f,1.f));
    if(EyeMat)EyeMat->SetVectorParameterValue(TEXT("BaseColor"),FLinearColor(.015f,.012f,.01f,1.f));
    if(ShoeMat)ShoeMat->SetVectorParameterValue(TEXT("BaseColor"),FLinearColor(.025f,.025f,.025f,1.f));
    auto MakePart=[this](const TCHAR* Name,UStaticMesh* Mesh,FVector Scale,FVector Location){
        UStaticMeshComponent* Part=CreateDefaultSubobject<UStaticMeshComponent>(Name);Part->SetupAttachment(Root);Part->SetStaticMesh(Mesh);Part->SetRelativeScale3D(Scale);Part->SetRelativeLocation(Location);Part->SetCollisionEnabled(ECollisionEnabled::NoCollision);return Part;
    };
    Torso=MakePart(TEXT("Torso"),Cube.Succeeded()?Cube.Object:nullptr,FVector(.42f,.24f,.65f),FVector(0,0,100.f));
    Head=MakePart(TEXT("Head"),Sphere.Succeeded()?Sphere.Object:nullptr,FVector(.28f,.28f,.28f),FVector(0,0,151.f));
    LeftLeg=MakePart(TEXT("LeftLeg"),Cube.Succeeded()?Cube.Object:nullptr,FVector(.13f,.14f,.42f),FVector(-12,-12,21.f));
    RightLeg=MakePart(TEXT("RightLeg"),Cube.Succeeded()?Cube.Object:nullptr,FVector(.13f,.14f,.42f),FVector(-12,12,21.f));
    LeftArm=MakePart(TEXT("LeftArm"),Cube.Succeeded()?Cube.Object:nullptr,FVector(.14f,.14f,.48f),FVector(0,-30,96.f));
    RightArm=MakePart(TEXT("RightArm"),Cube.Succeeded()?Cube.Object:nullptr,FVector(.14f,.14f,.48f),FVector(0,30,96.f));
    Hair=MakePart(TEXT("Hair"),Sphere.Succeeded()?Sphere.Object:nullptr,FVector(.3f,.3f,.13f),FVector(0,0,169.f));
    LeftEye=MakePart(TEXT("LeftEye"),Cube.Succeeded()?Cube.Object:nullptr,FVector(.035f,.045f,.035f),FVector(14,-5,154.f));
    RightEye=MakePart(TEXT("RightEye"),Cube.Succeeded()?Cube.Object:nullptr,FVector(.035f,.045f,.035f),FVector(14,5,154.f));
    Nose=MakePart(TEXT("Nose"),Sphere.Succeeded()?Sphere.Object:nullptr,FVector(.06f,.055f,.065f),FVector(16,0,148.f));
    Mouth=MakePart(TEXT("Mouth"),Cube.Succeeded()?Cube.Object:nullptr,FVector(.025f,.09f,.025f),FVector(13,0,140.f));
    LeftHand=MakePart(TEXT("LeftHand"),Sphere.Succeeded()?Sphere.Object:nullptr,FVector(.11f,.11f,.11f),FVector(0,-40,65.f));
    RightHand=MakePart(TEXT("RightHand"),Sphere.Succeeded()?Sphere.Object:nullptr,FVector(.11f,.11f,.11f),FVector(0,40,65.f));
    LeftFoot=MakePart(TEXT("LeftFoot"),Cube.Succeeded()?Cube.Object:nullptr,FVector(.24f,.16f,.1f),FVector(14,-12,5.f));
    RightFoot=MakePart(TEXT("RightFoot"),Cube.Succeeded()?Cube.Object:nullptr,FVector(.24f,.16f,.1f),FVector(14,12,5.f));
    auto Apply=[&](UStaticMeshComponent* Part,UMaterialInterface* Material){if(Part&&Material)Part->SetMaterial(0,Material);};
    Apply(Torso,Shirt);Apply(LeftArm,Shirt);Apply(RightArm,Shirt);Apply(Head,Skin);Apply(LeftLeg,Pants);Apply(RightLeg,Pants);Apply(Hair,HairMat);Apply(LeftEye,EyeMat);Apply(RightEye,EyeMat);Apply(Nose,Skin);Apply(Mouth,EyeMat);Apply(LeftHand,Skin);Apply(RightHand,Skin);Apply(LeftFoot,ShoeMat);Apply(RightFoot,ShoeMat);
}
void ADhakaPedestrian::BeginPlay()
{
    Super::BeginPlay();
    BaseWalkSpeed=WalkSpeed;
    if(GetWorld())
        for(TActorIterator<ADhakaWeatherController> It(GetWorld());It;++It){WeatherController=*It;break;}
}
void ADhakaPedestrian::ReactToVehicleImpact(const FVector& VehicleForward,float Severity)
{
    if(Severity<0.1f||!GetWorld())return;
    FVector Away=(-VehicleForward).GetSafeNormal2D();
    if(Away.IsNearlyZero())Away=GetActorRightVector();
    const FVector Side=FVector::CrossProduct(FVector::UpVector,Away).GetSafeNormal2D();
    Destination=GetActorLocation()+Away*FMath::Clamp(650.f+Severity*500.f,650.f,1800.f)+Side*FMath::FRandRange(-350.f,350.f);
    bWalkingToCrosswalk=false;
    bCrossingRoad=false;
    CrosswalkTravelDirection=FVector::ZeroVector;
    State=EDhakaPedestrianState::Walk;
    WaitRemaining=0.f;
    FleeRemaining=FMath::Clamp(2.f+Severity*3.f,2.f,6.f);
    WalkSpeed=FMath::Max(BaseWalkSpeed,260.f+Severity*80.f);
}

void ADhakaPedestrian::Tick(float Dt)
{
    Super::Tick(Dt); if(Dt<=0.f)return;
    if(FleeRemaining>0.f){FleeRemaining=FMath::Max(0.f,FleeRemaining-Dt);if(FleeRemaining<=0.f)WalkSpeed=BaseWalkSpeed;}
    CrowdLodRefreshTimer-=Dt;
    if(CrowdLodRefreshTimer<=0.f)
    {
        CrowdLodRefreshTimer=1.f;
        APawn* Player=UGameplayStatics::GetPlayerPawn(this,0);
        if(Player)
        {
            const float Distance=FVector::DistSquared2D(GetActorLocation(),Player->GetActorLocation());
            const float DesiredInterval=Distance>FMath::Square(50000.f)?.8f:(Distance>FMath::Square(18000.f)?.32f:.08f);
            if(!FMath::IsNearlyEqual(PrimaryActorTick.TickInterval,DesiredInterval,.02f))SetActorTickInterval(DesiredInterval);
            const bool bHide=Distance>FMath::Square(120000.f);
            if(bHide!=bVisualsHiddenForDistance)
            {
                bVisualsHiddenForDistance=bHide;
                for(UStaticMeshComponent* Part : {Torso.Get(),Head.Get(),LeftLeg.Get(),RightLeg.Get(),LeftArm.Get(),RightArm.Get(),Hair.Get(),LeftEye.Get(),RightEye.Get(),Nose.Get(),Mouth.Get(),LeftHand.Get(),RightHand.Get(),LeftFoot.Get(),RightFoot.Get()})
                    if(Part)Part->SetVisibility(!bHide,true);
            }
        }
    }
    WeatherRefreshTimer-=Dt;
    if(WeatherRefreshTimer<=0.f)
    {
        WeatherRefreshTimer=1.f;
        WeatherWalkMultiplier=1.f;
        if(WeatherController)
        {
            if(WeatherController->Weather==EDhakaWeather::Rain)WeatherWalkMultiplier=.88f;
            else if(WeatherController->Weather==EDhakaWeather::Monsoon)WeatherWalkMultiplier=.72f;
            else if(WeatherController->Weather==EDhakaWeather::Fog)WeatherWalkMultiplier=.92f;
        }
    }
    if(State==EDhakaPedestrianState::Shop||State==EDhakaPedestrianState::Talk||State==EDhakaPedestrianState::BoardVehicle){return;}
    if(State==EDhakaPedestrianState::Wait){WaitRemaining-=Dt;if(WaitRemaining<=0.f)State=EDhakaPedestrianState::Walk;else return;}
    FVector Delta=Destination-GetActorLocation();Delta.Z=0.f;
    if(Delta.Size2D()<=ArrivalRadius)
    {
        const FVector Here=GetActorLocation();
        const FVector Forward=GetActorForwardVector().GetSafeNormal2D();
        const bool bHorizontal=FMath::Abs(Forward.X)>=FMath::Abs(Forward.Y);
        constexpr float StreetGridStep=17777.78f;
        constexpr float StreetGridOrigin=-160000.f;
        constexpr float SidewalkOffset=660.f;

        // A pedestrian who reaches the approach point crosses only at a grid
        // intersection, then resumes walking along the opposite sidewalk.
        if(bWalkingToCrosswalk)
        {
            // Wait at the curb while a vehicle is close to the junction. The
            // wait state retries this same approach point after a short pause.
            bool bVehicleApproaching=false;
            for(TActorIterator<ADhakaTrafficVehicle> VehicleIt(GetWorld());VehicleIt;++VehicleIt)
            {
                const ADhakaTrafficVehicle* Traffic=*VehicleIt;
                if(!Traffic)continue;
                const FVector VehicleDelta=Traffic->GetActorLocation()-Here;
                const float Distance=VehicleDelta.Size2D();
                if(Distance>1050.f)continue;
                const FVector VehicleDirection=Traffic->RouteDirection.GetSafeNormal2D();
                const float Closing=FVector::DotProduct(-VehicleDelta,VehicleDirection);
                if(Closing>-250.f)
                {
                    bVehicleApproaching=true;
                    break;
                }
            }
            if(bVehicleApproaching)
            {
                State=EDhakaPedestrianState::Wait;
                WaitRemaining=FMath::FRandRange(.65f,1.15f);
                return;
            }
            bWalkingToCrosswalk=false;
            bCrossingRoad=true;
            CrosswalkTravelDirection=Forward;
            State=EDhakaPedestrianState::Cross;
            const float Lateral= bHorizontal ? Here.Y : Here.X;
            const float RoadCenter=StreetGridOrigin+FMath::RoundToFloat((Lateral-StreetGridOrigin)/StreetGridStep)*StreetGridStep;
            float SideSign=FMath::Sign(Lateral-RoadCenter);
            if(FMath::IsNearlyZero(SideSign))SideSign=FMath::RandBool()?1.f:-1.f;
            const float OppositeSide=RoadCenter-SideSign*SidewalkOffset;
            Destination=bHorizontal?FVector(Here.X,OppositeSide,Here.Z):FVector(OppositeSide,Here.Y,Here.Z);
            return;
        }
        if(bCrossingRoad)
        {
            bCrossingRoad=false;
            State=EDhakaPedestrianState::Walk;
            if(!CrosswalkTravelDirection.IsNearlyZero())SetActorRotation(CrosswalkTravelDirection.Rotation());
            Destination=Here+(!CrosswalkTravelDirection.IsNearlyZero()?CrosswalkTravelDirection:Forward)*FMath::FRandRange(450.f,950.f);
            CrosswalkTravelDirection=FVector::ZeroVector;
            return;
        }

        // Roughly one in six sidewalk segments heads to the nearest junction
        // before crossing, rather than stepping directly into traffic mid-block.
        if(FMath::FRand()<.16f)
        {
            bWalkingToCrosswalk=true;
            State=EDhakaPedestrianState::Walk;
            const float Along=bHorizontal?Here.X:Here.Y;
            const float Junction=StreetGridOrigin+FMath::RoundToFloat((Along-StreetGridOrigin)/StreetGridStep)*StreetGridStep;
            Destination=bHorizontal?FVector(Junction,Here.Y,Here.Z):FVector(Here.X,Junction,Here.Z);
            return;
        }

        State=EDhakaPedestrianState::Wait;
        WaitRemaining=FMath::FRandRange(.7f,2.8f);
        const FVector Side=FVector::CrossProduct(FVector::UpVector,Forward).GetSafeNormal2D();
        Destination=Here+Forward*FMath::FRandRange(450.f,950.f)+Side*FMath::FRandRange(-70.f,70.f);
        return;
    }
    FVector Direction=Delta.GetSafeNormal2D();
    const float Speed=(State==EDhakaPedestrianState::Cross?190.f:WalkSpeed)*WeatherWalkMultiplier;
    const FVector Start=GetActorLocation();
    const float Step=Speed*Dt;
    FCollisionQueryParams QueryParams(SCENE_QUERY_STAT(DhakaPedestrianAvoidance),false,this);
    FHitResult Hit;
    const FCollisionShape Shape=FCollisionShape::MakeCapsule(28.f,78.f);
    auto IsPathClear=[&](const FVector& Candidate)
    {
        FHitResult CandidateHit;
        return !GetWorld() || !GetWorld()->SweepSingleByChannel(CandidateHit,Start+FVector(0,0,4.f),Start+FVector(0,0,4.f)+Candidate*Step,FQuat::Identity,ECC_Pawn,Shape,QueryParams);
    };
    if(GetWorld() && GetWorld()->SweepSingleByChannel(Hit,Start+FVector(0,0,4.f),Start+FVector(0,0,4.f)+Direction*FMath::Max(Step,35.f),FQuat::Identity,ECC_Pawn,Shape,QueryParams))
    {
        const FVector Side=FVector::CrossProduct(FVector::UpVector,Direction).GetSafeNormal();
        const FVector Left= (Direction+Side*0.9f).GetSafeNormal();
        const FVector Right=(Direction-Side*0.9f).GetSafeNormal();
        if(IsPathClear(Left))Direction=Left;
        else if(IsPathClear(Right))Direction=Right;
        else
        {
            State=EDhakaPedestrianState::Wait;
            WaitRemaining=FMath::FRandRange(.35f,.9f);
            return;
        }
    }
    SetActorLocation(Start+Direction*Step,true);
    if(!Direction.IsNearlyZero())SetActorRotation(Direction.Rotation());
    WalkPhase+=Dt*7.f;
    // Animate limbs around their forward/backward pitch axis. Yaw rotation
    // made the old primitive legs swivel sideways instead of taking a step.
    const float Swing=(State==EDhakaPedestrianState::Wait?0.f:FMath::Sin(WalkPhase)*.72f);
    if(LeftLeg)LeftLeg->SetRelativeRotation(FRotator(Swing*28.f,0.f,0.f));
    if(RightLeg)RightLeg->SetRelativeRotation(FRotator(-Swing*28.f,0.f,0.f));
    if(LeftArm)LeftArm->SetRelativeRotation(FRotator(-Swing*20.f,0.f,0.f));
    if(RightArm)RightArm->SetRelativeRotation(FRotator(Swing*20.f,0.f,0.f));
    if(Torso)Torso->SetRelativeLocation(FVector(0.f,0.f,100.f+FMath::Abs(Swing)*2.5f));
    if(Head)Head->SetRelativeRotation(FRotator(-FMath::Abs(Swing)*2.f,0.f,0.f));
}
