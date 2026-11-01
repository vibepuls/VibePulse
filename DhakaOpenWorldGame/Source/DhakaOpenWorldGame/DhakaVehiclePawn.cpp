#include "DhakaVehiclePawn.h"
#include "Camera/CameraComponent.h"
#include "GameFramework/SpringArmComponent.h"
#include "Components/StaticMeshComponent.h"
#include "UObject/ConstructorHelpers.h"

ADhakaVehiclePawn::ADhakaVehiclePawn()
{
    PrimaryActorTick.bCanEverTick=true;
    Body=CreateDefaultSubobject<UStaticMeshComponent>(TEXT("VehicleBody")); SetRootComponent(Body);
    Body->SetSimulatePhysics(true); Body->SetLinearDamping(0.18f); Body->SetAngularDamping(1.8f);
    static ConstructorHelpers::FObjectFinder<UStaticMesh> MeshAsset(TEXT("/Engine/BasicShapes/Cube.Cube"));
    if(MeshAsset.Succeeded()) Body->SetStaticMesh(MeshAsset.Object);
    Body->SetRelativeScale3D(FVector(2.2f,4.4f,0.9f)); Body->SetMassOverrideInKg(NAME_None,1250.f,true);
    SpringArm=CreateDefaultSubobject<USpringArmComponent>(TEXT("ChaseArm")); SpringArm->SetupAttachment(Body); SpringArm->TargetArmLength=650.f; SpringArm->SetRelativeLocation(FVector(0,0,190)); SpringArm->bEnableCameraLag=true;
    Camera=CreateDefaultSubobject<UCameraComponent>(TEXT("ChaseCamera")); Camera->SetupAttachment(SpringArm);
    AutoPossessPlayer=EAutoReceiveInput::Player0;
}
void ADhakaVehiclePawn::SetupPlayerInputComponent(UInputComponent* Input)
{
    Super::SetupPlayerInputComponent(Input);
    Input->BindAxis("Throttle",this,&ADhakaVehiclePawn::InputThrottle);
    Input->BindAxis("Steer",this,&ADhakaVehiclePawn::InputSteer);
    Input->BindAxis("Brake",this,&ADhakaVehiclePawn::InputBrake);
}
void ADhakaVehiclePawn::InputThrottle(float V){ThrottleInput=FMath::Clamp(V,-1.f,1.f);}
void ADhakaVehiclePawn::InputSteer(float V){SteeringInput=FMath::Clamp(V,-1.f,1.f);}
void ADhakaVehiclePawn::InputBrake(float V){BrakeInput=FMath::Clamp(V,0.f,1.f);}
void ADhakaVehiclePawn::Tick(float Dt)
{
    Super::Tick(Dt);
    if(!Body || Dt<=0.f) return;
    FVector Forward=Body->GetForwardVector();
    Speed=FVector::DotProduct(Body->GetPhysicsLinearVelocity(),Forward);
    const float Desired=ThrottleInput*Acceleration;
    Body->AddForce(Forward*Desired*Body->GetMass());
    if(BrakeInput>0.f) Body->AddForce(-Body->GetPhysicsLinearVelocity().GetSafeNormal()*BrakeStrength*Body->GetMass()*BrakeInput);
    const float SpeedFactor=FMath::Clamp(FMath::Abs(Speed)/MaxSpeed,0.f,1.f);
    Body->AddTorqueInRadians(FVector(0.f,0.f,SteeringInput*SteeringRate*SpeedFactor*Body->GetMass()*4.f));
    if(Body->GetPhysicsLinearVelocity().Size()>MaxSpeed) Body->SetPhysicsLinearVelocity(Body->GetPhysicsLinearVelocity().GetSafeNormal()*MaxSpeed);
}
