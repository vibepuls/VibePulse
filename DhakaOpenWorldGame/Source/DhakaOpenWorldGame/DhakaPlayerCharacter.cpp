#include "DhakaPlayerCharacter.h"
#include "Camera/CameraComponent.h"
#include "GameFramework/SpringArmComponent.h"
#include "GameFramework/CharacterMovementComponent.h"
#include "GameFramework/PlayerController.h"
#include "GameFramework/Controller.h"
#include "DhakaVehiclePawn.h"
#include "DhakaVendorStall.h"
#include "DhakaPropertyTerminal.h"
#include "DhakaEconomySubsystem.h"
#include "DhakaMissionSubsystem.h"
#include "DhakaWeatherController.h"
#include "Engine/GameInstance.h"
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
    Input->BindAction("BuyProperty",IE_Pressed,this,&ADhakaPlayerCharacter::InteractProperty);
    Input->BindAction("ClaimRent",IE_Pressed,this,&ADhakaPlayerCharacter::ClaimPropertyIncome);
    Input->BindAxis("MissionSlot",this,&ADhakaPlayerCharacter::SelectMissionSlot);
    Input->BindAction("CycleWeather",IE_Pressed,this,&ADhakaPlayerCharacter::CycleWeatherInput);
    Input->BindAction("AdvanceTime",IE_Pressed,this,&ADhakaPlayerCharacter::AdvanceTimeInput);
    Input->BindAction("CameraCycle",IE_Pressed,this,&ADhakaPlayerCharacter::CycleCamera);
    Input->BindAction("UseFirstAid",IE_Pressed,this,&ADhakaPlayerCharacter::UseFirstAidInput);
    Input->BindAction("UseFood",IE_Pressed,this,&ADhakaPlayerCharacter::UseFoodInput);
    Input->BindAction("UseFuel",IE_Pressed,this,&ADhakaPlayerCharacter::UseFuelInput);
    Input->BindAction("UseRepair",IE_Pressed,this,&ADhakaPlayerCharacter::UseRepairInput);
}
void ADhakaPlayerCharacter::Tick(float DeltaSeconds)
{
    Super::Tick(DeltaSeconds);
    if(GetCharacterMovement()->MaxWalkSpeed>SprintSpeed*.8f && Stamina>0.f)
    {
        Stamina=FMath::Max(0.f,Stamina-22.f*DeltaSeconds);
        if(Stamina<=0.f)StopSprint();
    }
    else Stamina=FMath::Min(100.f,Stamina+12.f*DeltaSeconds);
}
void ADhakaPlayerCharacter::UseFirstAidInput(){if(UGameInstance* GI=GetGameInstance())if(UDhakaEconomySubsystem* E=GI->GetSubsystem<UDhakaEconomySubsystem>())E->UseItem(TEXT("first_aid"),this);}
void ADhakaPlayerCharacter::UseFoodInput(){if(UGameInstance* GI=GetGameInstance())if(UDhakaEconomySubsystem* E=GI->GetSubsystem<UDhakaEconomySubsystem>())E->UseItem(TEXT("street_snack"),this);}
void ADhakaPlayerCharacter::UseFuelInput(){if(UGameInstance* GI=GetGameInstance())if(UDhakaEconomySubsystem* E=GI->GetSubsystem<UDhakaEconomySubsystem>())E->UseItem(TEXT("fuel_can"),this);}
void ADhakaPlayerCharacter::UseRepairInput(){if(UGameInstance* GI=GetGameInstance())if(UDhakaEconomySubsystem* E=GI->GetSubsystem<UDhakaEconomySubsystem>())E->UseItem(TEXT("repair_kit"),this);}
void ADhakaPlayerCharacter::MoveForward(float V){if(!Controller||FMath::IsNearlyZero(V))return;const FRotator Yaw(0,Controller->GetControlRotation().Yaw,0);AddMovementInput(FRotationMatrix(Yaw).GetUnitAxis(EAxis::X),V);}
void ADhakaPlayerCharacter::MoveRight(float V){if(!Controller||FMath::IsNearlyZero(V))return;const FRotator Yaw(0,Controller->GetControlRotation().Yaw,0);AddMovementInput(FRotationMatrix(Yaw).GetUnitAxis(EAxis::Y),V);}
void ADhakaPlayerCharacter::Turn(float V){AddControllerYawInput(V);}
void ADhakaPlayerCharacter::LookUp(float V){AddControllerPitchInput(V);}
void ADhakaPlayerCharacter::CycleCamera(){bFirstPerson=!bFirstPerson;CameraArm->TargetArmLength=bFirstPerson?0.f:360.f;CameraArm->SetRelativeLocation(bFirstPerson?FVector(18,0,65):FVector(0,0,80));}
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
        Candidate->SetOccupied(true);Candidate->SetDriverController(PC);PC->Possess(Candidate);Destroy();return;
    }
    // If no vehicle is in reach, E interacts with the nearest street vendor.
    ADhakaVendorStall* NearestVendor=nullptr;
    float VendorDistance=425.f;
    for(TActorIterator<ADhakaVendorStall> It(GetWorld());It;++It)
    {
        const float Distance=FVector::Dist2D(GetActorLocation(),It->GetActorLocation());
        if(Distance<VendorDistance){VendorDistance=Distance;NearestVendor=*It;}
    }
    if(NearestVendor)
    {
        if(!NearestVendor->Interact(this))
        {
            if(UGameInstance* GI=GetGameInstance())
                if(UDhakaEconomySubsystem* Economy=GI->GetSubsystem<UDhakaEconomySubsystem>())
                    Economy->LastTransactionMessage=FText::FromString(TEXT("Purchase failed: check wallet or vendor stock."));
        }
    }
}

void ADhakaPlayerCharacter::InteractProperty()
{
    ADhakaPropertyTerminal* Nearest=nullptr;float BestDistance=500.f;
    for(TActorIterator<ADhakaPropertyTerminal> It(GetWorld());It;++It)
    {
        const float Distance=FVector::Dist2D(GetActorLocation(),It->GetActorLocation());
        if(Distance<BestDistance){BestDistance=Distance;Nearest=*It;}
    }
    if(Nearest)
    {
        if(!Nearest->Interact(this))
            if(UGameInstance* GI=GetGameInstance())if(UDhakaEconomySubsystem* Economy=GI->GetSubsystem<UDhakaEconomySubsystem>())
                if(Economy->LastTransactionMessage.IsEmpty())Economy->LastTransactionMessage=FText::FromString(TEXT("Property purchase unavailable."));
    }
    else if(UGameInstance* GI=GetGameInstance())if(UDhakaEconomySubsystem* Economy=GI->GetSubsystem<UDhakaEconomySubsystem>())
        Economy->LastTransactionMessage=FText::FromString(TEXT("No property office nearby. Find a property sign."));
}
void ADhakaPlayerCharacter::ClaimPropertyIncome()
{
    if(UGameInstance* GI=GetGameInstance())if(UDhakaEconomySubsystem* Economy=GI->GetSubsystem<UDhakaEconomySubsystem>())
        Economy->ClaimPropertyIncome();
}

void ADhakaPlayerCharacter::SelectMissionSlot(float Value)
{
    const int32 Slot=FMath::RoundToInt(Value);
    if(Slot<=0){LastMissionSlot=0;return;}
    if(Slot==LastMissionSlot)return;
    LastMissionSlot=Slot;
    if(UGameInstance* GI=GetGameInstance())if(UDhakaMissionSubsystem* Missions=GI->GetSubsystem<UDhakaMissionSubsystem>())Missions->StartMissionBySlot(Slot);
}

void ADhakaPlayerCharacter::CycleWeatherInput(){for(TActorIterator<ADhakaWeatherController> It(GetWorld());It;++It){It->CycleWeather();break;}}
void ADhakaPlayerCharacter::AdvanceTimeInput(){for(TActorIterator<ADhakaWeatherController> It(GetWorld());It;++It){It->AdvanceTimeOfDay();break;}}
