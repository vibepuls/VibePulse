#include "DhakaPedestrian.h"
#include "Components/StaticMeshComponent.h"
#include "Components/SceneComponent.h"
#include "Components/CapsuleComponent.h"
#include "Materials/MaterialInstanceDynamic.h"
#include "UObject/ConstructorHelpers.h"

ADhakaPedestrian::ADhakaPedestrian()
{
    PrimaryActorTick.bCanEverTick=true;
    Root=CreateDefaultSubobject<USceneComponent>(TEXT("Root"));SetRootComponent(Root);
    CollisionCapsule=CreateDefaultSubobject<UCapsuleComponent>(TEXT("PedestrianCollision"));CollisionCapsule->SetupAttachment(Root);CollisionCapsule->SetRelativeLocation(FVector(0,0,92.f));CollisionCapsule->InitCapsuleSize(38.f,92.f);CollisionCapsule->SetCollisionProfileName(TEXT("Pawn"));CollisionCapsule->SetCollisionEnabled(ECollisionEnabled::QueryAndPhysics);
    static ConstructorHelpers::FObjectFinder<UStaticMesh> Cube(TEXT("/Engine/BasicShapes/Cube.Cube"));
    static ConstructorHelpers::FObjectFinder<UStaticMesh> Sphere(TEXT("/Engine/BasicShapes/Sphere.Sphere"));
    UMaterialInterface* Base=LoadObject<UMaterialInterface>(nullptr,TEXT("/Engine/BasicShapes/BasicShapeMaterial.BasicShapeMaterial"));
    UMaterialInstanceDynamic* Shirt=Base?UMaterialInstanceDynamic::Create(Base,this):nullptr;
    UMaterialInstanceDynamic* Skin=Base?UMaterialInstanceDynamic::Create(Base,this):nullptr;
    UMaterialInstanceDynamic* Pants=Base?UMaterialInstanceDynamic::Create(Base,this):nullptr;
    UMaterialInstanceDynamic* HairMat=Base?UMaterialInstanceDynamic::Create(Base,this):nullptr;
    UMaterialInstanceDynamic* EyeMat=Base?UMaterialInstanceDynamic::Create(Base,this):nullptr;
    if(Shirt)Shirt->SetVectorParameterValue(TEXT("BaseColor"),FLinearColor(FMath::FRandRange(.08f,.75f),FMath::FRandRange(.08f,.75f),FMath::FRandRange(.08f,.75f),1.f));
    if(Skin)Skin->SetVectorParameterValue(TEXT("BaseColor"),FLinearColor(FMath::FRandRange(.35f,.7f),FMath::FRandRange(.2f,.46f),FMath::FRandRange(.12f,.28f),1.f));
    if(Pants)Pants->SetVectorParameterValue(TEXT("BaseColor"),FLinearColor(FMath::FRandRange(.04f,.2f),FMath::FRandRange(.05f,.22f),FMath::FRandRange(.07f,.25f),1.f));
    if(HairMat)HairMat->SetVectorParameterValue(TEXT("BaseColor"),FLinearColor(.035f,.028f,.022f,1.f));
    if(EyeMat)EyeMat->SetVectorParameterValue(TEXT("BaseColor"),FLinearColor(.015f,.012f,.01f,1.f));
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
    Apply(Torso,Shirt);Apply(LeftArm,Shirt);Apply(RightArm,Shirt);Apply(Head,Skin);Apply(LeftLeg,Pants);Apply(RightLeg,Pants);Apply(Hair,HairMat);Apply(LeftEye,EyeMat);Apply(RightEye,EyeMat);Apply(Nose,Skin);Apply(Mouth,EyeMat);Apply(LeftHand,Skin);Apply(RightHand,Skin);Apply(LeftFoot,DarkMat);Apply(RightFoot,DarkMat);
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
    const FVector Direction=Delta.GetSafeNormal2D();
    const float Speed=State==EDhakaPedestrianState::Cross?190.f:WalkSpeed;
    SetActorLocation(GetActorLocation()+Direction*Speed*Dt,true);
    if(!Direction.IsNearlyZero())SetActorRotation(Direction.Rotation());
    WalkPhase+=Dt*7.f;
    const float Swing=(State==EDhakaPedestrianState::Wait?0.f:FMath::Sin(WalkPhase)*.38f);
    if(LeftLeg)LeftLeg->SetRelativeRotation(FRotator(0,Swing*28.f,0));
    if(RightLeg)RightLeg->SetRelativeRotation(FRotator(0,-Swing*28.f,0));
    if(LeftArm)LeftArm->SetRelativeRotation(FRotator(0,-Swing*20.f,0));
    if(RightArm)RightArm->SetRelativeRotation(FRotator(0,Swing*20.f,0));
}
