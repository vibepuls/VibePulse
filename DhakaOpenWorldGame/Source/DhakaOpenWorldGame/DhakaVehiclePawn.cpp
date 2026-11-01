#include "DhakaVehiclePawn.h"
#include "Camera/CameraComponent.h"
#include "GameFramework/SpringArmComponent.h"
#include "Components/StaticMeshComponent.h"
#include "Materials/MaterialInstanceDynamic.h"
#include "UObject/ConstructorHelpers.h"

ADhakaVehiclePawn::ADhakaVehiclePawn()
{
    PrimaryActorTick.bCanEverTick=true;
    Body=CreateDefaultSubobject<UStaticMeshComponent>(TEXT("VehicleBody")); SetRootComponent(Body);
    Body->SetSimulatePhysics(true); Body->SetLinearDamping(0.18f); Body->SetAngularDamping(1.8f);
    static ConstructorHelpers::FObjectFinder<UStaticMesh> Cube(TEXT("/Engine/BasicShapes/Cube.Cube"));
    static ConstructorHelpers::FObjectFinder<UStaticMesh> Cylinder(TEXT("/Engine/BasicShapes/Cylinder.Cylinder"));
    if(Cube.Succeeded()) Body->SetStaticMesh(Cube.Object);
    Body->SetRelativeScale3D(FVector(4.4f,2.0f,0.9f)); Body->SetMassOverrideInKg(NAME_None,1250.f,true);
    Body->SetCollisionProfileName(TEXT("PhysicsActor"));
    auto MakePart=[this](const TCHAR* Name,UStaticMesh* Mesh,FVector Scale,FVector Location,FRotator Rotation=FRotator::ZeroRotator){
        UStaticMeshComponent* Part=CreateDefaultSubobject<UStaticMeshComponent>(Name);Part->SetupAttachment(Body);Part->SetStaticMesh(Mesh);Part->SetRelativeScale3D(Scale);Part->SetRelativeLocation(Location);Part->SetRelativeRotation(Rotation);Part->SetCollisionEnabled(ECollisionEnabled::NoCollision);VisualParts.Add(Part);return Part;
    };
    MakePart(TEXT("Cabin"),Cube.Succeeded()?Cube.Object:nullptr,FVector(2.2f,1.65f,.62f),FVector(-8,0,65));
    MakePart(TEXT("Windshield"),Cube.Succeeded()?Cube.Object:nullptr,FVector(.08f,1.45f,.42f),FVector(82,0,78),FRotator(0,0,0));
    MakePart(TEXT("RearWindow"),Cube.Succeeded()?Cube.Object:nullptr,FVector(.08f,1.42f,.38f),FVector(-98,0,75));
    for(int32 Side=-1;Side<=1;Side+=2){
        MakePart(Side<0?TEXT("LeftFrontWindow"):TEXT("RightFrontWindow"),Cube.Succeeded()?Cube.Object:nullptr,FVector(.95f,.055f,.36f),FVector(25,Side*83,76));
        MakePart(Side<0?TEXT("LeftRearWindow"):TEXT("RightRearWindow"),Cube.Succeeded()?Cube.Object:nullptr,FVector(.72f,.055f,.34f),FVector(-48,Side*83,75));
        for(int32 Axle : {-1,1}) MakePart(Side<0?(Axle<0?TEXT("LeftRearWheel"):TEXT("LeftFrontWheel")):(Axle<0?TEXT("RightRearWheel"):TEXT("RightFrontWheel")),Cylinder.Succeeded()?Cylinder.Object:nullptr,FVector(.42f,.19f,.42f),FVector(Axle*132.f,Side*101.f,-24.f),FRotator(90,0,0));
        MakePart(Side<0?TEXT("LeftHeadlight"):TEXT("RightHeadlight"),Cube.Succeeded()?Cube.Object:nullptr,FVector(.12f,.28f,.12f),FVector(216,Side*64.f,4.f));
        MakePart(Side<0?TEXT("LeftTaillight"):TEXT("RightTaillight"),Cube.Succeeded()?Cube.Object:nullptr,FVector(.1f,.25f,.16f),FVector(-216,Side*64.f,4.f));
    }
    MakePart(TEXT("FrontBumper"),Cube.Succeeded()?Cube.Object:nullptr,FVector(.12f,1.95f,.13f),FVector(222,0,-22));
    MakePart(TEXT("RearBumper"),Cube.Succeeded()?Cube.Object:nullptr,FVector(.12f,1.95f,.13f),FVector(-222,0,-22));
    UMaterialInterface* BaseMaterial=LoadObject<UMaterialInterface>(nullptr,TEXT("/Engine/BasicShapes/BasicShapeMaterial.BasicShapeMaterial"));
    if(BaseMaterial){BodyMaterial=UMaterialInstanceDynamic::Create(BaseMaterial,this);BodyMaterial->SetVectorParameterValue(TEXT("BaseColor"),PaintColor);Body->SetMaterial(0,BodyMaterial);}
    SpringArm=CreateDefaultSubobject<USpringArmComponent>(TEXT("ChaseArm")); SpringArm->SetupAttachment(Body); SpringArm->TargetArmLength=650.f; SpringArm->SetRelativeLocation(FVector(-20,0,190)); SpringArm->bEnableCameraLag=true;
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
void ADhakaVehiclePawn::SetPaintColor(FLinearColor NewColor){PaintColor=NewColor;if(BodyMaterial)BodyMaterial->SetVectorParameterValue(TEXT("BaseColor"),PaintColor);}
void ADhakaVehiclePawn::Tick(float Dt)
{
    Super::Tick(Dt); if(!Body || Dt<=0.f) return;
    const FVector Forward=GetActorForwardVector();
    Speed=FVector::DotProduct(Body->GetPhysicsLinearVelocity(),Forward);
    Body->AddForce(Forward*ThrottleInput*Acceleration*Body->GetMass());
    if(BrakeInput>0.f) Body->AddForce(-Body->GetPhysicsLinearVelocity().GetSafeNormal()*BrakeStrength*Body->GetMass()*BrakeInput);
    const float SpeedFactor=FMath::Clamp(FMath::Abs(Speed)/MaxSpeed,0.f,1.f);
    Body->AddTorqueInRadians(FVector(0.f,0.f,SteeringInput*SteeringRate*SpeedFactor*Body->GetMass()*4.f));
    if(Body->GetPhysicsLinearVelocity().Size()>MaxSpeed) Body->SetPhysicsLinearVelocity(Body->GetPhysicsLinearVelocity().GetSafeNormal()*MaxSpeed);
}
