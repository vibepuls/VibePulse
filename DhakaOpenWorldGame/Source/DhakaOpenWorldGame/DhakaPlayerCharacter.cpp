#include "DhakaPlayerCharacter.h"
#include "Camera/CameraComponent.h"
#include "GameFramework/SpringArmComponent.h"
#include "GameFramework/CharacterMovementComponent.h"
#include "GameFramework/PlayerController.h"
#include "GameFramework/Controller.h"
#include "DhakaVehiclePawn.h"
#include "Engine/World.h"
#include "EngineUtils.h"

ADhakaPlayerCharacter::ADhakaPlayerCharacter()
{
    PrimaryActorTick.bCanEverTick=true;
    GetCharacterMovement()->MaxWalkSpeed=NormalWalkSpeed;
    GetCharacterMovement()->bOrientRotationToMovement=true;
    bUseControllerRotationYaw=false;
    CameraArm=CreateDefaultSubobject<USpringArmComponent>(TEXT("WalkCameraArm"));CameraArm->SetupAttachment(GetRootComponent());CameraArm->TargetArmLength=360.f;CameraArm->SetRelativeLocation(FVector(0,0,80));CameraArm->bUsePawnControlRotation=true;CameraArm->bEnableCameraLag=true;
    Camera=CreateDefaultSubobject<UCameraComponent>(TEXT("WalkCamera"));Camera->SetupAttachment(CameraArm);
}
void ADhakaPlayerCharacter::SetupPlayerInputComponent(UInputComponent* Input)
{
    Super::SetupPlayerInputComponent(Input);
    Input->BindAxis("MoveForward",this,&ADhakaPlayerCharacter::MoveForward);
    Input->BindAxis("MoveRight",this,&ADhakaPlayerCharacter::MoveRight);
    Input->BindAxis("Turn",this,&ADhakaPlayerCharacter::Turn);
    Input->BindAxis("LookUp",this,&ADhakaPlayerCharacter::LookUp);
    Input->BindAction("Sprint",IE_Pressed,this,&ADhakaPlayerCharacter::StartSprint);
    Input->BindAction("Sprint",IE_Released,this,&ADhakaPlayerCharacter::StopSprint);
    Input->BindAction("Jump",IE_Pressed,this,&ADhakaPlayerCharacter::StartJump);
    Input->BindAction("Jump",IE_Released,this,&ADhakaPlayerCharacter::StopJump);
    Input->BindAction("InteractVehicle",IE_Pressed,this,&ADhakaPlayerCharacter::InteractVehicle);
}
void ADhakaPlayerCharacter::MoveForward(float V){if(!Controller||FMath::IsNearlyZero(V))return;const FRotator Yaw(0,Controller->GetControlRotation().Yaw,0);AddMovementInput(FRotationMatrix(Yaw).GetUnitAxis(EAxis::X),V);}
void ADhakaPlayerCharacter::MoveRight(float V){if(!Controller||FMath::IsNearlyZero(V))return;const FRotator Yaw(0,Controller->GetControlRotation().Yaw,0);AddMovementInput(FRotationMatrix(Yaw).GetUnitAxis(EAxis::Y),V);}
void ADhakaPlayerCharacter::Turn(float V){AddControllerYawInput(V);}
void ADhakaPlayerCharacter::LookUp(float V){AddControllerPitchInput(V);}
void ADhakaPlayerCharacter::StartSprint(){GetCharacterMovement()->MaxWalkSpeed=SprintSpeed;}
void ADhakaPlayerCharacter::StopSprint(){GetCharacterMovement()->MaxWalkSpeed=NormalWalkSpeed;}
void ADhakaPlayerCharacter::StartJump(){Jump();}
void ADhakaPlayerCharacter::StopJump(){StopJumping();}
void ADhakaPlayerCharacter::InteractVehicle()
{
    APlayerController* PC=Cast<APlayerController>(GetController());if(!PC||!GetWorld())return;
    ADhakaVehiclePawn* Candidate=NearbyVehicle;
    if(!Candidate||Candidate->bOccupied||FVector::Dist2D(GetActorLocation(),Candidate->GetActorLocation())>450.f){
        Candidate=nullptr;float Best=450.f;
        for(TActorIterator<ADhakaVehiclePawn> It(GetWorld());It;++It){if(It->bOccupied)continue;const float D=FVector::Dist2D(GetActorLocation(),It->GetActorLocation());if(D<Best){Best=D;Candidate=*It;}}
    }
    if(Candidate&&!Candidate->bOccupied&&FVector::Dist2D(GetActorLocation(),Candidate->GetActorLocation())<=450.f){
        Candidate->SetOccupied(true);Candidate->SetDriverController(PC);PC->Possess(Candidate);Destroy();
    }
}
