#include "DhakaTrafficVehicle.h"
#include "Components/StaticMeshComponent.h"
#include "Engine/World.h"
#include "EngineUtils.h"
#include "UObject/ConstructorHelpers.h"
#include "DhakaVehiclePawn.h"

ADhakaTrafficVehicle::ADhakaTrafficVehicle()
{
    PrimaryActorTick.bCanEverTick=true;
    Body=CreateDefaultSubobject<UStaticMeshComponent>(TEXT("TrafficBody")); SetRootComponent(Body);
    static ConstructorHelpers::FObjectFinder<UStaticMesh> Cube(TEXT("/Engine/BasicShapes/Cube.Cube"));
    if(Cube.Succeeded()) Body->SetStaticMesh(Cube.Object);
    Body->SetRelativeScale3D(FVector(2.0f,4.1f,1.1f)); Body->SetCollisionProfileName(TEXT("BlockAll"));
    RouteDirection=FVector(1,0,0);
}
void ADhakaTrafficVehicle::BeginPlay(){Super::BeginPlay();RouteDirection=RouteDirection.GetSafeNormal();if(RouteDirection.IsNearlyZero())RouteDirection=FVector(1,0,0);CurrentSpeed=CruiseSpeed*0.55f;}
void ADhakaTrafficVehicle::Tick(float Dt)
{
    Super::Tick(Dt); if(!GetWorld()||Dt<=0.f)return;
    float Desired=CruiseSpeed;
    if(bYieldToPlayer){
        for(TActorIterator<ADhakaVehiclePawn> It(GetWorld());It;++It){
            const FVector Delta=It->GetActorLocation()-GetActorLocation(); const float Ahead=FVector::DotProduct(Delta,RouteDirection);
            const float Side=FVector::CrossProduct(Delta,RouteDirection).Size();
            if(Ahead>0.f&&Ahead<BrakeDistance&&Side<260.f){Desired=FMath::Min(Desired,CruiseSpeed*FMath::Clamp(Ahead/BrakeDistance,0.05f,1.f));}
        }
    }
    CurrentSpeed=FMath::FInterpTo(CurrentSpeed,Desired,Dt,1.5f);
    AddActorWorldOffset(RouteDirection*CurrentSpeed*Dt,true);
    SetActorRotation(FMath::RInterpTo(GetActorRotation(),RouteDirection.Rotation(),Dt,2.f));
}
