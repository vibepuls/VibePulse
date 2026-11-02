#include "DhakaTrafficVehicle.h"
#include "Components/StaticMeshComponent.h"
#include "Engine/World.h"
#include "EngineUtils.h"
#include "UObject/ConstructorHelpers.h"
#include "DhakaVehiclePawn.h"
#include "DhakaTrafficSignal.h"

ADhakaTrafficVehicle::ADhakaTrafficVehicle()
{
    PrimaryActorTick.bCanEverTick=true;
    Body=CreateDefaultSubobject<UStaticMeshComponent>(TEXT("TrafficBody")); SetRootComponent(Body);
    static ConstructorHelpers::FObjectFinder<UStaticMesh> Cube(TEXT("/Engine/BasicShapes/Cube.Cube"));
    if(Cube.Succeeded()) Body->SetStaticMesh(Cube.Object);
    Body->SetRelativeScale3D(FVector(4.1f,2.0f,1.1f)); Body->SetCollisionProfileName(TEXT("BlockAll"));
    RouteDirection=FVector(1,0,0);
}
void ADhakaTrafficVehicle::BeginPlay(){Super::BeginPlay();RouteDirection=RouteDirection.GetSafeNormal();if(RouteDirection.IsNearlyZero())RouteDirection=FVector(1,0,0);CurrentSpeed=CruiseSpeed*0.55f;}
void ADhakaTrafficVehicle::Tick(float Dt)
{
    Super::Tick(Dt);
    if(!GetWorld()||Dt<=0.f)return;
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
            if(Ahead>0.f&&Ahead<BrakeDistance+250.f&&Side<650.f&&Signal->IsRedForDirection(Direction))
            { bRedSignalAhead=true;break; }
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
    AddActorWorldOffset(RouteDirection.GetSafeNormal2D()*CurrentSpeed*Dt,true);
    SetActorRotation(FMath::RInterpTo(GetActorRotation(),RouteDirection.GetSafeNormal2D().Rotation(),Dt,2.f));
}
