#include "DhakaPlayerCharacter.h"
#include "DhakaCharacterAnimInstance.h"
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
#include "Engine/Engine.h"
#include "Engine/GameViewportClient.h"
#include "GameFramework/GameUserSettings.h"
#include "EngineUtils.h"
#include "Components/StaticMeshComponent.h"
#include "Components/SkeletalMeshComponent.h"
#include "Engine/SkeletalMesh.h"
#include "Animation/AnimInstance.h"
#include "Materials/MaterialInstanceDynamic.h"
#include "UObject/ConstructorHelpers.h"

ADhakaPlayerCharacter::ADhakaPlayerCharacter()
{
    PrimaryActorTick.bCanEverTick=true;
    GetCharacterMovement()->MaxWalkSpeed=NormalWalkSpeed;
    GetCharacterMovement()->bOrientRotationToMovement=true;
    bUseControllerRotationYaw=false;
    CameraArm=CreateDefaultSubobject<USpringArmComponent>(TEXT("WalkCameraArm"));CameraArm->SetupAttachment(GetRootComponent());CameraArm->TargetArmLength=360.f;CameraArm->SetRelativeLocation(FVector(0,0,80));CameraArm->bUsePawnControlRotation=true;CameraArm->bEnableCameraLag=true;
    Camera=CreateDefaultSubobject<UCameraComponent>(TEXT("WalkCamera"));Camera->SetupAttachment(CameraArm);
    // Prefer the imported, fully weighted humanoid skeletal mesh and Animation Blueprint.
    // The procedural six-part mannequin remains a fallback until the content-generation
    // scripts have been run in Blender and Unreal Editor.
    static ConstructorHelpers::FObjectFinder<USkeletalMesh> PlayerSkeletalMesh(TEXT("/Game/Characters/Player/SK_DhakaHuman.SK_DhakaHuman"));
    static ConstructorHelpers::FClassFinder<UDhakaCharacterAnimInstance> PlayerAnimationBlueprint(TEXT("/Game/Characters/Player/ABP_PlayerDhaka"));
    static ConstructorHelpers::FObjectFinder<UStaticMesh> BodyCube(TEXT("/Engine/BasicShapes/Cube.Cube"));
    UMaterialInterface* BaseMaterial=LoadObject<UMaterialInterface>(nullptr,TEXT("/Engine/BasicShapes/BasicShapeMaterial.BasicShapeMaterial"));
    auto MakeBodyPart=[this,&BodyCube,BaseMaterial](const TCHAR* Name,const FVector& Scale,const FVector& Location,const FLinearColor& Color)->UStaticMeshComponent*
    {
        UStaticMeshComponent* Part=CreateDefaultSubobject<UStaticMeshComponent>(Name);
        Part->SetupAttachment(GetRootComponent());
        if(BodyCube.Succeeded())Part->SetStaticMesh(BodyCube.Object);
        Part->SetRelativeScale3D(Scale);Part->SetRelativeLocation(Location);
        Part->SetCollisionEnabled(ECollisionEnabled::NoCollision);
        if(BaseMaterial)if(UMaterialInstanceDynamic* Mat=UMaterialInstanceDynamic::Create(BaseMaterial,this))
        {
            Mat->SetVectorParameterValue(TEXT("BaseColor"),Color);
            Mat->SetVectorParameterValue(TEXT("Color"),Color);
            Part->SetMaterial(0,Mat);
        }
        return Part;
    };
    ProceduralTorso=MakeBodyPart(TEXT("PlayerProceduralTorso"),FVector(.34f,.24f,.43f),FVector(0,0,2),FLinearColor(.08f,.22f,.58f));
    ProceduralHead=MakeBodyPart(TEXT("PlayerProceduralHead"),FVector(.22f,.22f,.22f),FVector(0,0,56),FLinearColor(.62f,.39f,.25f));
    ProceduralLeftArm=MakeBodyPart(TEXT("PlayerProceduralLeftArm"),FVector(.12f,.13f,.34f),FVector(0,-30,0),FLinearColor(.62f,.39f,.25f));
    ProceduralRightArm=MakeBodyPart(TEXT("PlayerProceduralRightArm"),FVector(.12f,.13f,.34f),FVector(0,30,0),FLinearColor(.62f,.39f,.25f));
    ProceduralLeftLeg=MakeBodyPart(TEXT("PlayerProceduralLeftLeg"),FVector(.14f,.15f,.42f),FVector(0,-14,-43),FLinearColor(.055f,.065f,.08f));
    ProceduralRightLeg=MakeBodyPart(TEXT("PlayerProceduralRightLeg"),FVector(.14f,.15f,.42f),FVector(0,14,-43),FLinearColor(.055f,.065f,.08f));
    if(PlayerSkeletalMesh.Succeeded())
    {
        GetMesh()->SetSkeletalMesh(PlayerSkeletalMesh.Object);
        GetMesh()->SetRelativeLocation(FVector(0.f,0.f,-90.f));
        GetMesh()->SetRelativeRotation(FRotator(0.f,-90.f,0.f));
        if(PlayerAnimationBlueprint.Succeeded())
        {
            GetMesh()->SetAnimationMode(EAnimationMode::AnimationBlueprint);
            GetMesh()->SetAnimInstanceClass(PlayerAnimationBlueprint.Class);
        }
        // Avoid drawing the block mannequin over the skinned mesh.
        if(ProceduralTorso)ProceduralTorso->SetVisibility(false,true);
        if(ProceduralHead)ProceduralHead->SetVisibility(false,true);
        if(ProceduralLeftArm)ProceduralLeftArm->SetVisibility(false,true);
        if(ProceduralRightArm)ProceduralRightArm->SetVisibility(false,true);
        if(ProceduralLeftLeg)ProceduralLeftLeg->SetVisibility(false,true);
        if(ProceduralRightLeg)ProceduralRightLeg->SetVisibility(false,true);
    }
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
    Input->BindAction("CycleGraphicsQuality",IE_Pressed,this,&ADhakaPlayerCharacter::CycleGraphicsQuality);
    Input->BindAction("CameraCycle",IE_Pressed,this,&ADhakaPlayerCharacter::CycleCamera);
    Input->BindAction("UseFirstAid",IE_Pressed,this,&ADhakaPlayerCharacter::UseFirstAidInput);
    Input->BindAction("UseFood",IE_Pressed,this,&ADhakaPlayerCharacter::UseFoodInput);
    Input->BindAction("UseFuel",IE_Pressed,this,&ADhakaPlayerCharacter::UseFuelInput);
    Input->BindAction("UseRepair",IE_Pressed,this,&ADhakaPlayerCharacter::UseRepairInput);
    Input->BindTouch(IE_Pressed,this,&ADhakaPlayerCharacter::HandleTouchPressed);
    Input->BindTouch(IE_Repeat,this,&ADhakaPlayerCharacter::HandleTouchMoved);
    Input->BindTouch(IE_Released,this,&ADhakaPlayerCharacter::HandleTouchReleased);
}
float ADhakaPlayerCharacter::TakeDamage(float DamageAmount,FDamageEvent const& DamageEvent,AController* EventInstigator,AActor* DamageCauser)
{
    if(DamageAmount>0.f)Health=FMath::Clamp(Health-DamageAmount,0.f,100.f);
    return DamageAmount;
}
void ADhakaPlayerCharacter::Tick(float DeltaSeconds)
{
    Super::Tick(DeltaSeconds);
    const float MovementSpeed=GetVelocity().Size2D();
    if(MovementSpeed>8.f)
    {
        ProceduralAnimationTime+=DeltaSeconds*FMath::Clamp(MovementSpeed/NormalWalkSpeed,0.7f,1.8f)*8.f;
        const float Swing=FMath::Sin(ProceduralAnimationTime);
        if(ProceduralLeftArm)ProceduralLeftArm->SetRelativeRotation(FRotator(-Swing*25.f,0.f,0.f));
        if(ProceduralRightArm)ProceduralRightArm->SetRelativeRotation(FRotator(Swing*25.f,0.f,0.f));
        if(ProceduralLeftLeg)ProceduralLeftLeg->SetRelativeRotation(FRotator(Swing*30.f,0.f,0.f));
        if(ProceduralRightLeg)ProceduralRightLeg->SetRelativeRotation(FRotator(-Swing*30.f,0.f,0.f));
        if(ProceduralTorso)ProceduralTorso->SetRelativeLocation(FVector(0,0,2.f+FMath::Abs(Swing)*2.5f));
    }
    else
    {
        if(ProceduralLeftArm)ProceduralLeftArm->SetRelativeRotation(FRotator::ZeroRotator);
        if(ProceduralRightArm)ProceduralRightArm->SetRelativeRotation(FRotator::ZeroRotator);
        if(ProceduralLeftLeg)ProceduralLeftLeg->SetRelativeRotation(FRotator::ZeroRotator);
        if(ProceduralRightLeg)ProceduralRightLeg->SetRelativeRotation(FRotator::ZeroRotator);
        if(ProceduralTorso)ProceduralTorso->SetRelativeLocation(FVector(0,0,2.f));
    }
    if(GetCharacterMovement()->MaxWalkSpeed>SprintSpeed*.8f && Stamina>0.f)
    {
        Stamina=FMath::Max(0.f,Stamina-22.f*DeltaSeconds);
        if(Stamina<=0.f)StopSprint();
    }
    else Stamina=FMath::Min(100.f,Stamina+12.f*DeltaSeconds);
    if(Controller && bTouchMoveActive)
    {
        const FRotator Yaw(0.f,Controller->GetControlRotation().Yaw,0.f);
        AddMovementInput(FRotationMatrix(Yaw).GetUnitAxis(EAxis::X),TouchMoveForward);
        AddMovementInput(FRotationMatrix(Yaw).GetUnitAxis(EAxis::Y),TouchMoveRight);
    }
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
void ADhakaPlayerCharacter::StartSprint(){if(Stamina>15.f) GetCharacterMovement()->MaxWalkSpeed=SprintSpeed;}
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
void ADhakaPlayerCharacter::CycleGraphicsQuality(){if(UGameUserSettings* Settings=UGameUserSettings::GetGameUserSettings()){int32 Level=Settings->GetOverallScalabilityLevel();Level=(FMath::Clamp(Level,0,3)+1)%4;Settings->SetOverallScalabilityLevel(Level);Settings->ApplySettings(false);Settings->SaveSettings();}}

void ADhakaPlayerCharacter::HandleTouchPressed(ETouchIndex::Type FingerIndex,FVector Location)
{
    TouchStartLocation=Location;LastTouchLocation=Location;
    if(!GEngine||!GEngine->GameViewport)return;
    FVector2D ViewSize;GEngine->GameViewport->GetViewportSize(ViewSize);
    if(ViewSize.X<=0.f)return;
    if(Location.X<ViewSize.X*.48f){bTouchMoveActive=true;bTouchLookActive=false;TouchMoveForward=0.f;TouchMoveRight=0.f;}
    else {bTouchLookActive=true;bTouchMoveActive=false;}
}
void ADhakaPlayerCharacter::HandleTouchMoved(ETouchIndex::Type FingerIndex,FVector Location)
{
    if(!GEngine||!GEngine->GameViewport)return;
    FVector2D ViewSize;GEngine->GameViewport->GetViewportSize(ViewSize);
    if(ViewSize.X<=0.f)return;
    if(bTouchMoveActive)
    {
        const FVector Delta=Location-TouchStartLocation;
        TouchMoveForward=FMath::Clamp(-Delta.Y/105.f,-1.f,1.f);
        TouchMoveRight=FMath::Clamp(Delta.X/105.f,-1.f,1.f);
    }
    else if(bTouchLookActive)
    {
        const FVector Delta=Location-LastTouchLocation;
        AddControllerYawInput(Delta.X*.075f);
        AddControllerPitchInput(-Delta.Y*.075f);
    }
    LastTouchLocation=Location;
}
void ADhakaPlayerCharacter::HandleTouchReleased(ETouchIndex::Type FingerIndex,FVector Location)
{
    bTouchMoveActive=false;bTouchLookActive=false;
    TouchMoveForward=0.f;TouchMoveRight=0.f;
}
