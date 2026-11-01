#include "DhakaPedestrian.h"
#include "Components/StaticMeshComponent.h"
#include "Components/SceneComponent.h"
#include "UObject/ConstructorHelpers.h"

ADhakaPedestrian::ADhakaPedestrian()
{
    PrimaryActorTick.bCanEverTick=true;
    Root=CreateDefaultSubobject<USceneComponent>(TEXT("Root"));SetRootComponent(Root);
    static ConstructorHelpers::FObjectFinder<UStaticMesh> Cube(TEXT("/Engine/BasicShapes/Cube.Cube"));
    static ConstructorHelpers::FObjectFinder<UStaticMesh> Sphere(TEXT("/Engine/BasicShapes/Sphere.Sphere"));
    auto MakePart=[this](const TCHAR* Name,UStaticMesh* Mesh,FVector Scale,FVector Location){
        UStaticMeshComponent* Part=CreateDefaultSubobject<UStaticMeshComponent>(Name);Part->SetupAttachment(Root);Part->SetRelativeScale3D(Scale);Part->SetRelativeLocation(Location);Part->SetCollisionEnabled(ECollisionEnabled::NoCollision);if(Mesh)Part->SetStaticMesh(Mesh);return Part;
    };
    Torso=MakePart(TEXT("Torso"),Cube.Succeeded()?Cube.Object:nullptr,FVector(.42f,.24f,.65f),FVector(0,0,100.f));
    Head=MakePart(TEXT("Head"),Sphere.Succeeded()?Sphere.Object:nullptr,FVector(.28f,.28f,.28f),FVector(0,0,151.f));
    LeftLeg=MakePart(TEXT("LeftLeg"),Cube.Succeeded()?Cube.Object:nullptr,FVector(.13f,.14f,.42f),FVector(-12,0,21.f));
    RightLeg=MakePart(TEXT("RightLeg"),Cube.Succeeded()?Cube.Object:nullptr,FVector(.13f,.14f,.42f),FVector(12,0,21.f));
}
void ADhakaPedestrian::Tick(float Dt)
{
    Super::Tick(Dt); if(Dt<=0.f)return;
    if(State==EDhakaPedestrianState::Shop||State==EDhakaPedestrianState::Talk||State==EDhakaPedestrianState::BoardVehicle){return;}
    if(State==EDhakaPedestrianState::Wait){WaitRemaining-=Dt;if(WaitRemaining<=0.f)State=EDhakaPedestrianState::Walk;else return;}
    FVector Delta=Destination-GetActorLocation();Delta.Z=0.f;
    if(Delta.Size2D()<=ArrivalRadius){
        State=EDhakaPedestrianState::Wait;WaitRemaining=FMath::FRandRange(.7f,2.8f);
        Destination=GetActorLocation()+FVector(FMath::FRandRange(-700.f,700.f),FMath::FRandRange(-700.f,700.f),0.f);
        return;
    }
    if(State==EDhakaPedestrianState::Cross) WalkSpeed=190.f; else WalkSpeed=150.f;
    const FVector Direction=Delta.GetSafeNormal2D();
    SetActorLocation(GetActorLocation()+Direction*WalkSpeed*Dt,true);
    if(!Direction.IsNearlyZero())SetActorRotation(Direction.Rotation());
}
