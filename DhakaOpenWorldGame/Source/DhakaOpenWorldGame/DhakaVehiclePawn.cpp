#include "DhakaVehiclePawn.h"
#include "Camera/CameraComponent.h"
#include "GameFramework/SpringArmComponent.h"
#include "Components/StaticMeshComponent.h"
#include "Components/BoxComponent.h"
#include "Materials/MaterialInstanceDynamic.h"
#include "UObject/ConstructorHelpers.h"
#include "Kismet/GameplayStatics.h"
#include "DhakaSaveGame.h"
#include "DhakaMissionSubsystem.h"
#include "DhakaWeatherController.h"
#include "DhakaAudioDirector.h"
#include "EngineUtils.h"
#include "DhakaPlayerCharacter.h"
#include "GameFramework/PlayerController.h"
#include "GameFramework/Controller.h"
#include "Engine/GameInstance.h"
#include "Engine/Engine.h"
#include "Engine/GameViewportClient.h"

ADhakaVehiclePawn::ADhakaVehiclePawn()
{
    PrimaryActorTick.bCanEverTick=true;
    PhysicsBody=CreateDefaultSubobject<UBoxComponent>(TEXT("VehiclePhysicsBody"));SetRootComponent(PhysicsBody);
    PhysicsBody->SetBoxExtent(FVector(220.f,100.f,45.f));PhysicsBody->SetSimulatePhysics(true);PhysicsBody->SetLinearDamping(0.18f);PhysicsBody->SetAngularDamping(1.8f);
    PhysicsBody->SetMassOverrideInKg(NAME_None,1250.f,true);PhysicsBody->SetCollisionProfileName(TEXT("PhysicsActor"));
    static ConstructorHelpers::FObjectFinder<UStaticMesh> Cube(TEXT("/Engine/BasicShapes/Cube.Cube"));
    static ConstructorHelpers::FObjectFinder<UStaticMesh> Cylinder(TEXT("/Engine/BasicShapes/Cylinder.Cylinder"));
    Body=CreateDefaultSubobject<UStaticMeshComponent>(TEXT("VehicleBody"));Body->SetupAttachment(PhysicsBody);
    if(Cube.Succeeded()) Body->SetStaticMesh(Cube.Object);
    Body->SetRelativeScale3D(FVector(4.4f,2.0f,0.9f));Body->SetCollisionEnabled(ECollisionEnabled::NoCollision);
    UMaterialInterface* BaseMaterial=LoadObject<UMaterialInterface>(nullptr,TEXT("/Engine/BasicShapes/BasicShapeMaterial.BasicShapeMaterial"));
    BodyMaterial=BaseMaterial?UMaterialInstanceDynamic::Create(BaseMaterial,this):nullptr;
    UMaterialInstanceDynamic* GlassMaterial=BaseMaterial?UMaterialInstanceDynamic::Create(BaseMaterial,this):nullptr;
    UMaterialInstanceDynamic* DarkMaterial=BaseMaterial?UMaterialInstanceDynamic::Create(BaseMaterial,this):nullptr;
    UMaterialInstanceDynamic* LightMaterial=BaseMaterial?UMaterialInstanceDynamic::Create(BaseMaterial,this):nullptr;
    UMaterialInstanceDynamic* TailMaterial=BaseMaterial?UMaterialInstanceDynamic::Create(BaseMaterial,this):nullptr;
    UMaterialInstanceDynamic* ChromeMaterial=BaseMaterial?UMaterialInstanceDynamic::Create(BaseMaterial,this):nullptr;
    if(BodyMaterial)BodyMaterial->SetVectorParameterValue(TEXT("BaseColor"),PaintColor);
    if(GlassMaterial){GlassMaterial->SetVectorParameterValue(TEXT("BaseColor"),FLinearColor(.13f,.34f,.43f,.65f));GlassMaterial->SetScalarParameterValue(TEXT("Roughness"),.18f);}
    if(DarkMaterial)DarkMaterial->SetVectorParameterValue(TEXT("BaseColor"),FLinearColor(.055f,.065f,.07f,1.f));
    if(LightMaterial)LightMaterial->SetVectorParameterValue(TEXT("BaseColor"),FLinearColor(1.f,.92f,.67f,1.f));
    if(TailMaterial)TailMaterial->SetVectorParameterValue(TEXT("BaseColor"),FLinearColor(.75f,.025f,.018f,1.f));
    if(ChromeMaterial)ChromeMaterial->SetVectorParameterValue(TEXT("BaseColor"),FLinearColor(.45f,.48f,.5f,1.f));
    if(BodyMaterial)Body->SetMaterial(0,BodyMaterial);
    auto MakePart=[this,GlassMaterial,DarkMaterial,LightMaterial,TailMaterial,ChromeMaterial](const TCHAR* Name,UStaticMesh* Mesh,FVector Scale,FVector Location,FRotator Rotation=FRotator::ZeroRotator){
        UStaticMeshComponent* Part=CreateDefaultSubobject<UStaticMeshComponent>(Name);Part->SetupAttachment(PhysicsBody);Part->SetStaticMesh(Mesh);Part->SetRelativeScale3D(Scale);Part->SetRelativeLocation(Location);Part->SetRelativeRotation(Rotation);Part->SetCollisionEnabled(ECollisionEnabled::NoCollision);
        const FString N(Name);UMaterialInterface* Mat=this->BodyMaterial;
        if(N.Contains(TEXT("Window")))Mat=GlassMaterial;
        else if(N.Contains(TEXT("Headlight")))Mat=LightMaterial;
        else if(N.Contains(TEXT("Taillight")))Mat=TailMaterial;
        else if(N.Contains(TEXT("WheelRim"))||N.Contains(TEXT("Grille"))||N.Contains(TEXT("Plate"))||N.Contains(TEXT("Mirror")))Mat=ChromeMaterial;
        else if(N.Contains(TEXT("Wheel"))||N.Contains(TEXT("Interior"))||N.Contains(TEXT("Seat"))||N.Contains(TEXT("Pedal"))||N.Contains(TEXT("Console"))||N.Contains(TEXT("Steering")))Mat=DarkMaterial;
        if(Mat)Part->SetMaterial(0,Mat);VisualParts.Add(Part);return Part;
    };
    // Body panels, open cabin frame, glazed windows and detailed exterior trim.
    MakePart(TEXT("Hood"),Cube.Succeeded()?Cube.Object:nullptr,FVector(1.28f,1.88f,.16f),FVector(145,0,34));
    MakePart(TEXT("Trunk"),Cube.Succeeded()?Cube.Object:nullptr,FVector(.72f,1.86f,.16f),FVector(-158,0,33));
    MakePart(TEXT("Roof"),Cube.Succeeded()?Cube.Object:nullptr,FVector(2.18f,1.58f,.18f),FVector(-8,0,105));
    for(int32 Side=-1;Side<=1;Side+=2){
        for(int32 Front=-1;Front<=1;Front+=2)MakePart(Side<0?(Front<0?TEXT("LeftRearPillar"):TEXT("LeftFrontPillar")):(Front<0?TEXT("RightRearPillar"):TEXT("RightFrontPillar")),Cube.Succeeded()?Cube.Object:nullptr,FVector(.13f,.13f,.78f),FVector(Front*94.f,Side*76.f,62.f));
        MakePart(Side<0?TEXT("LeftFrontWindow"):TEXT("RightFrontWindow"),Cube.Succeeded()?Cube.Object:nullptr,FVector(.92f,.055f,.36f),FVector(25,Side*82.f,76));
        MakePart(Side<0?TEXT("LeftRearWindow"):TEXT("RightRearWindow"),Cube.Succeeded()?Cube.Object:nullptr,FVector(.72f,.055f,.34f),FVector(-48,Side*82.f,75));
        MakePart(Side<0?TEXT("LeftDoorPanel"):TEXT("RightDoorPanel"),Cube.Succeeded()?Cube.Object:nullptr,FVector(1.18f,.06f,.45f),FVector(0,Side*99.f,7.f));
        MakePart(Side<0?TEXT("LeftDoorHandle"):TEXT("RightDoorHandle"),Cube.Succeeded()?Cube.Object:nullptr,FVector(.15f,.035f,.045f),FVector(5,Side*103.f,24.f));
        MakePart(Side<0?TEXT("LeftSideMirror"):TEXT("RightSideMirror"),Cube.Succeeded()?Cube.Object:nullptr,FVector(.2f,.2f,.14f),FVector(102,Side*111.f,57.f));
        for(int32 Axle : {-1,1}){
            MakePart(Side<0?(Axle<0?TEXT("LeftRearWheel"):TEXT("LeftFrontWheel")):(Axle<0?TEXT("RightRearWheel"):TEXT("RightFrontWheel")),Cylinder.Succeeded()?Cylinder.Object:nullptr,FVector(.42f,.19f,.42f),FVector(Axle*132.f,Side*101.f,-24.f),FRotator(90,0,0));
            MakePart(Side<0?(Axle<0?TEXT("LeftRearWheelRim"):TEXT("LeftFrontWheelRim")):(Axle<0?TEXT("RightRearWheelRim"):TEXT("RightFrontWheelRim")),Cylinder.Succeeded()?Cylinder.Object:nullptr,FVector(.23f,.205f,.23f),FVector(Axle*132.f,Side*103.f,-24.f),FRotator(90,0,0));
        }
        MakePart(Side<0?TEXT("LeftHeadlight"):TEXT("RightHeadlight"),Cube.Succeeded()?Cube.Object:nullptr,FVector(.12f,.28f,.12f),FVector(216,Side*64.f,4.f));
        MakePart(Side<0?TEXT("LeftTaillight"):TEXT("RightTaillight"),Cube.Succeeded()?Cube.Object:nullptr,FVector(.1f,.25f,.16f),FVector(-216,Side*64.f,4.f));
        MakePart(Side<0?TEXT("LeftExhaust"):TEXT("RightExhaust"),Cylinder.Succeeded()?Cylinder.Object:nullptr,FVector(.08f,.08f,.24f),FVector(-218,Side*55.f,-30.f),FRotator(0,90,0));
    }
    MakePart(TEXT("FrontBumper"),Cube.Succeeded()?Cube.Object:nullptr,FVector(.12f,1.95f,.13f),FVector(222,0,-22));
    MakePart(TEXT("RearBumper"),Cube.Succeeded()?Cube.Object:nullptr,FVector(.12f,1.95f,.13f),FVector(-222,0,-22));
    MakePart(TEXT("FrontGrille"),Cube.Succeeded()?Cube.Object:nullptr,FVector(.035f,.62f,.22f),FVector(222,0,-2));
    MakePart(TEXT("FrontLicensePlate"),Cube.Succeeded()?Cube.Object:nullptr,FVector(.035f,.44f,.12f),FVector(224,0,-16));
    MakePart(TEXT("RearLicensePlate"),Cube.Succeeded()?Cube.Object:nullptr,FVector(.035f,.44f,.12f),FVector(-224,0,-10));
    // Simple but functional-looking cabin interior visible through the glazing.
    MakePart(TEXT("DriverSeat"),Cube.Succeeded()?Cube.Object:nullptr,FVector(.48f,.48f,.5f),FVector(-20,-42,27));
    MakePart(TEXT("PassengerSeat"),Cube.Succeeded()?Cube.Object:nullptr,FVector(.48f,.48f,.5f),FVector(-20,42,27));
    MakePart(TEXT("DriverSeatBack"),Cube.Succeeded()?Cube.Object:nullptr,FVector(.18f,.48f,.62f),FVector(-56,-42,57));
    MakePart(TEXT("PassengerSeatBack"),Cube.Succeeded()?Cube.Object:nullptr,FVector(.18f,.48f,.62f),FVector(-56,42,57));
    MakePart(TEXT("Dashboard"),Cube.Succeeded()?Cube.Object:nullptr,FVector(.22f,1.42f,.24f),FVector(72,0,43));
    MakePart(TEXT("InstrumentCluster"),Cube.Succeeded()?Cube.Object:nullptr,FVector(.035f,.42f,.14f),FVector(84,-32,54));
    MakePart(TEXT("SteeringWheel"),Cylinder.Succeeded()?Cylinder.Object:nullptr,FVector(.055f,.24f,.24f),FVector(78,-37,57),FRotator(0,90,0));
    MakePart(TEXT("CenterConsole"),Cube.Succeeded()?Cube.Object:nullptr,FVector(.68f,.25f,.16f),FVector(4,0,37));
    MakePart(TEXT("GearSelector"),Cube.Succeeded()?Cube.Object:nullptr,FVector(.08f,.08f,.18f),FVector(30,0,49));
    MakePart(TEXT("InteriorMirror"),Cube.Succeeded()?Cube.Object:nullptr,FVector(.16f,.035f,.045f),FVector(63,0,91));
    MakePart(TEXT("InteriorLight"),Cube.Succeeded()?Cube.Object:nullptr,FVector(.12f,.12f,.035f),FVector(-12,0,96));
    SpringArm=CreateDefaultSubobject<USpringArmComponent>(TEXT("ChaseArm")); SpringArm->SetupAttachment(PhysicsBody); SpringArm->TargetArmLength=650.f; SpringArm->SetRelativeLocation(FVector(-20,0,190)); SpringArm->bEnableCameraLag=true;
    Camera=CreateDefaultSubobject<UCameraComponent>(TEXT("ChaseCamera")); Camera->SetupAttachment(SpringArm);
    AutoPossessPlayer=EAutoReceiveInput::Player0;
}
void ADhakaVehiclePawn::SetupPlayerInputComponent(UInputComponent* Input)
{
    Super::SetupPlayerInputComponent(Input);
    Input->BindAxis("Throttle",this,&ADhakaVehiclePawn::InputThrottle);
    Input->BindAxis("Steer",this,&ADhakaVehiclePawn::InputSteer);
    Input->BindAxis("Brake",this,&ADhakaVehiclePawn::InputBrake);
    Input->BindAction("SaveGame",IE_Pressed,this,&ADhakaVehiclePawn::SaveProgress);
    Input->BindAction("LoadGame",IE_Pressed,this,&ADhakaVehiclePawn::LoadProgress);
    Input->BindAction("ToggleVehicle",IE_Pressed,this,&ADhakaVehiclePawn::ToggleVehicleMode);
    Input->BindAction("CameraCycle",IE_Pressed,this,&ADhakaVehiclePawn::CycleCamera);
    Input->BindAction("Horn",IE_Pressed,this,&ADhakaVehiclePawn::PlayHornInput);
    Input->BindAction("RickshawBell",IE_Pressed,this,&ADhakaVehiclePawn::PlayRickshawBellInput);
    Input->BindAxis("MissionSlot",this,&ADhakaVehiclePawn::SelectMissionSlot);
    // Mobile: left-side touch steers; upper-right accelerates; lower-right brakes.
    Input->BindTouch(IE_Pressed,this,&ADhakaVehiclePawn::HandleTouchPressed);
    Input->BindTouch(IE_Repeat,this,&ADhakaVehiclePawn::HandleTouchMoved);
    Input->BindTouch(IE_Released,this,&ADhakaVehiclePawn::HandleTouchReleased);
}
void ADhakaVehiclePawn::SelectMissionSlot(float Value)
{
    const int32 Slot=FMath::RoundToInt(Value);
    if(Slot<=0){LastMissionSlot=0;return;}
    if(Slot==LastMissionSlot)return;
    LastMissionSlot=Slot;
    if(UGameInstance* GI=GetGameInstance())if(UDhakaMissionSubsystem* Missions=GI->GetSubsystem<UDhakaMissionSubsystem>())Missions->StartMissionBySlot(Slot);
}
void ADhakaVehiclePawn::PlayHornInput(){for(TActorIterator<ADhakaAudioDirector> It(GetWorld());It;++It){It->PlayHorn();break;}}
void ADhakaVehiclePawn::PlayRickshawBellInput(){for(TActorIterator<ADhakaAudioDirector> It(GetWorld());It;++It){It->PlayRickshawBell();break;}}
void ADhakaVehiclePawn::InputThrottle(float V){ThrottleInput=FMath::Clamp(V,-1.f,1.f);}
void ADhakaVehiclePawn::InputSteer(float V){SteeringInput=FMath::Clamp(V,-1.f,1.f);}
void ADhakaVehiclePawn::InputBrake(float V){BrakeInput=FMath::Clamp(V,0.f,1.f);}
void ADhakaVehiclePawn::SetPaintColor(FLinearColor NewColor){PaintColor=NewColor;if(BodyMaterial)BodyMaterial->SetVectorParameterValue(TEXT("BaseColor"),PaintColor);}
void ADhakaVehiclePawn::Tick(float Dt)
{
    Super::Tick(Dt); if(!PhysicsBody || Dt<=0.f) return;
    const FVector Forward=GetActorForwardVector();
    Speed=FVector::DotProduct(PhysicsBody->GetPhysicsLinearVelocity(),Forward);
    TravelDistanceKm+=PhysicsBody->GetPhysicsLinearVelocity().Size()*Dt/100000.f;
    WeatherQueryTimer-=Dt;
    if(WeatherQueryTimer<=0.f)
    {
        WeatherQueryTimer=.5f;
        CachedWeatherGrip=1.f;
        for(TActorIterator<ADhakaWeatherController> It(GetWorld());It;++It)
        {
            if(It->Weather==EDhakaWeather::Rain)CachedWeatherGrip=.82f;
            else if(It->Weather==EDhakaWeather::Monsoon)CachedWeatherGrip=.58f;
            else if(It->Weather==EDhakaWeather::Fog)CachedWeatherGrip=.94f;
            break;
        }
    }
    // Mission completion is owned by UDhakaMissionSubsystem so every mission uses its configured radius and timer.
    const FVector Velocity=PhysicsBody->GetPhysicsLinearVelocity();
    const FVector ForwardVelocity=Forward*FVector::DotProduct(Velocity,Forward);
    const FVector LateralVelocity=Velocity-ForwardVelocity;
    PhysicsBody->AddForce(Forward*ThrottleInput*Acceleration*PhysicsBody->GetMass());
    // Tire-like lateral grip: damp side-slip without hard teleporting velocity; wet weather lowers the grip.
    PhysicsBody->AddForce(-LateralVelocity*PhysicsBody->GetMass()*FMath::Lerp(2.2f,8.5f,CachedWeatherGrip));
    if(BrakeInput>0.f) PhysicsBody->AddForce(-Velocity.GetSafeNormal()*BrakeStrength*CachedWeatherGrip*PhysicsBody->GetMass()*BrakeInput);
    else if(FMath::IsNearlyZero(ThrottleInput)) PhysicsBody->AddForce(-ForwardVelocity*PhysicsBody->GetMass()*.22f);
    const float SpeedFactor=FMath::Clamp(FMath::Abs(Speed)/MaxSpeed,0.f,1.f);
    PhysicsBody->AddTorqueInRadians(FVector(0.f,0.f,SteeringInput*SteeringRate*SpeedFactor*CachedWeatherGrip*PhysicsBody->GetMass()*4.f));
    // Reduce excessive lateral slide and high-speed steering response for heavier, wet-road handling.
    if(FMath::Abs(Speed)>MaxSpeed*.72f) PhysicsBody->AddTorqueInRadians(FVector(0.f,0.f,-PhysicsBody->GetPhysicsAngularVelocityInRadians().Z*PhysicsBody->GetMass()*0.35f));
    if(PhysicsBody->GetPhysicsLinearVelocity().Size()>MaxSpeed) PhysicsBody->SetPhysicsLinearVelocity(PhysicsBody->GetPhysicsLinearVelocity().GetSafeNormal()*MaxSpeed);
    const float WheelSpin=Speed*Dt/32.f;
    bool bNight=false;
    for(TActorIterator<ADhakaWeatherController> It(GetWorld());It;++It)
    {
        bNight=It->TimeOfDayHours<6.f||It->TimeOfDayHours>=18.5f;
        break;
    }
    for(UStaticMeshComponent* Part:VisualParts)
    {
        if(!Part)continue;
        const FString PartName=Part->GetName();
        if(PartName.Contains(TEXT("Wheel")))
        {
            FRotator WheelRotation=Part->GetRelativeRotation();
            WheelRotation.Pitch+=FMath::RadiansToDegrees(WheelSpin);
            Part->SetRelativeRotation(WheelRotation);
        }
        if(PartName.Contains(TEXT("Headlight")))Part->SetVisibility(bNight,true);
        if(PartName.Contains(TEXT("Taillight")))
        {
            if(UMaterialInstanceDynamic* Light=Cast<UMaterialInstanceDynamic>(Part->GetMaterial(0)))
            {
                const FLinearColor BrakeColor=BrakeInput>0.05f?FLinearColor(1.f,.008f,.004f):FLinearColor(.35f,.012f,.008f);
                Light->SetVectorParameterValue(TEXT("BaseColor"),BrakeColor);
                Light->SetScalarParameterValue(TEXT("EmissiveStrength"),BrakeInput>0.05f?3.5f:.35f);
            }
        }
    }
}

void ADhakaVehiclePawn::SaveProgress()
{
    UDhakaSaveGame* Save=Cast<UDhakaSaveGame>(UGameplayStatics::CreateSaveGameObject(UDhakaSaveGame::StaticClass()));
    if(!Save)return;
    Save->PlayerLocation=GetActorLocation();Save->PlayerRotation=GetActorRotation();Save->TravelDistanceKm=TravelDistanceKm;
    if(UGameInstance* GI=GetGameInstance())if(UDhakaMissionSubsystem* Missions=GI->GetSubsystem<UDhakaMissionSubsystem>()){
        Save->Wallet=Missions->Wallet;
        for(const FDhakaMission& Mission:Missions->Missions)if(Mission.bCompleted)Save->CompletedMissionIds.Add(Mission.Id);
    }
    if(GetWorld())for(TActorIterator<ADhakaWeatherController> It(GetWorld());It;++It){Save->Weather=FString::FromInt(static_cast<int32>(It->Weather));Save->DayTimeHours=It->TimeOfDayHours;break;}
    UGameplayStatics::SaveGameToSlot(Save,TEXT("DhakaOpenWorldSave"),0);
}
void ADhakaVehiclePawn::LoadProgress()
{
    UDhakaSaveGame* Save=Cast<UDhakaSaveGame>(UGameplayStatics::LoadGameFromSlot(TEXT("DhakaOpenWorldSave"),0));
    if(!Save)return;
    SetActorLocation(Save->PlayerLocation,false,nullptr,ETeleportType::TeleportPhysics);SetActorRotation(Save->PlayerRotation);TravelDistanceKm=FMath::Max(0.f,Save->TravelDistanceKm);
    if(PhysicsBody)PhysicsBody->SetPhysicsLinearVelocity(FVector::ZeroVector);
    if(UGameInstance* GI=GetGameInstance())if(UDhakaMissionSubsystem* Missions=GI->GetSubsystem<UDhakaMissionSubsystem>())
    {
        if(!Missions->LoadProgress())
        {
            Missions->Wallet=FMath::Max<int64>(0,Save->Wallet);
            Missions->ActiveMissionIndex=INDEX_NONE;
            for(int32 I=0;I<Missions->Missions.Num();++I)
            {
                Missions->Missions[I].bCompleted=Save->CompletedMissionIds.Contains(Missions->Missions[I].Id);
                Missions->Missions[I].bFailed=false;
                if(Missions->ActiveMissionIndex==INDEX_NONE&&!Missions->Missions[I].bCompleted)
                    Missions->ActiveMissionIndex=I;
            }
            Missions->EnsureMissionMonitor();
        }
    }
    if(GetWorld())
    {
        const int32 WeatherIndex=FMath::Clamp(FCString::Atoi(*Save->Weather),0,4);
        for(TActorIterator<ADhakaWeatherController> It(GetWorld());It;++It)
        {
            It->SetWeather(static_cast<EDhakaWeather>(WeatherIndex));
            It->SetTimeOfDay(Save->DayTimeHours);
            break;
        }
    }
}

void ADhakaVehiclePawn::ToggleVehicleMode()
{
    APlayerController* PC=Cast<APlayerController>(GetController());if(!PC||!GetWorld())return;
    DriverController=PC;
    if(PhysicsBody)PhysicsBody->SetPhysicsLinearVelocity(FVector::ZeroVector);
    const FVector ExitLocation=GetActorLocation()+GetActorRightVector()*280.f+FVector(0,0,75.f);
    ADhakaPlayerCharacter* Character=GetWorld()->SpawnActor<ADhakaPlayerCharacter>(ADhakaPlayerCharacter::StaticClass(),ExitLocation,GetActorRotation());
    if(Character){bOccupied=false;Character->SetNearbyVehicle(this);PC->Possess(Character);}
}

void ADhakaVehiclePawn::CycleCamera()
{
    CameraModeIndex=(CameraModeIndex+1)%3;
    if(CameraModeIndex==0){SpringArm->TargetArmLength=650.f;SpringArm->SetRelativeLocation(FVector(-20,0,190));}
    else if(CameraModeIndex==1){SpringArm->TargetArmLength=260.f;SpringArm->SetRelativeLocation(FVector(-10,0,145));}
    else{SpringArm->TargetArmLength=0.f;SpringArm->SetRelativeLocation(FVector(92,0,82));}
}

void ADhakaVehiclePawn::UpdateTouchControls(FVector Location)
{
    if(!GEngine||!GEngine->GameViewport)return;
    FVector2D ViewSize;GEngine->GameViewport->GetViewportSize(ViewSize);
    if(ViewSize.X<=0.f||ViewSize.Y<=0.f)return;
    const float X=Location.X/ViewSize.X,Y=Location.Y/ViewSize.Y;
    if(X<.48f)
    {
        bTouchSteeringActive=true;
        SteeringInput=FMath::Clamp((X-.24f)/.20f,-1.f,1.f);
    }
    else if(Y<.72f)
    {
        bTouchThrottleActive=true;bTouchBrakeActive=false;
        ThrottleInput=FMath::Clamp((.72f-Y)/.45f,.15f,1.f);BrakeInput=0.f;
    }
    else
    {
        bTouchBrakeActive=true;bTouchThrottleActive=false;
        BrakeInput=FMath::Clamp((Y-.65f)/.35f,.2f,1.f);ThrottleInput=0.f;
    }
}
void ADhakaVehiclePawn::HandleTouchPressed(ETouchIndex::Type FingerIndex,FVector Location){UpdateTouchControls(Location);}
void ADhakaVehiclePawn::HandleTouchMoved(ETouchIndex::Type FingerIndex,FVector Location){UpdateTouchControls(Location);}
void ADhakaVehiclePawn::HandleTouchReleased(ETouchIndex::Type FingerIndex,FVector Location)
{
    if(bTouchSteeringActive){SteeringInput=0.f;bTouchSteeringActive=false;}
    if(bTouchThrottleActive){ThrottleInput=0.f;bTouchThrottleActive=false;}
    if(bTouchBrakeActive){BrakeInput=0.f;bTouchBrakeActive=false;}
}
