#include "DhakaAudioDirector.h"
#include "DhakaVehiclePawn.h"
#include "DhakaTrafficVehicle.h"
#include "DhakaWeatherController.h"
#include "EngineUtils.h"
#include "Components/AudioComponent.h"
#include "Components/SceneComponent.h"
#include "GameFramework/Pawn.h"
#include "Kismet/GameplayStatics.h"
#include "Sound/SoundBase.h"

ADhakaAudioDirector::ADhakaAudioDirector()
{
    PrimaryActorTick.bCanEverTick = true;
    SetActorTickInterval(0.5f);
    RootComponent = CreateDefaultSubobject<USceneComponent>(TEXT("AudioRoot"));
}
void ADhakaAudioDirector::BeginPlay()
{
    Super::BeginPlay();
    TrafficAudio=CreateLoop(TEXT("CityTrafficAudio"),CityTrafficLoop,AmbienceVolume);
    MarketAudio=CreateLoop(TEXT("MarketAudio"),MarketLoop,AmbienceVolume*0.8f);
    RainAudio=CreateLoop(TEXT("RainAudio"),RainLoop,AmbienceVolume);
    RiverAudio=CreateLoop(TEXT("RiverfrontAudio"),RiverfrontLoop,AmbienceVolume*0.7f);
    EngineAudio=CreateLoop(TEXT("PlayerEngineAudio"),EngineLoop,AmbienceVolume);
    SirenAudio=CreateLoop(TEXT("EmergencySirenAudio"),EmergencySirenLoop,OneShotVolume);
}
UAudioComponent* ADhakaAudioDirector::CreateLoop(const TCHAR* Name,USoundBase* Sound,float Volume)
{
    UAudioComponent* Component=NewObject<UAudioComponent>(this,Name);
    if(!Component)return nullptr;
    Component->bAutoActivate=false; Component->bAllowSpatialization=false;
    Component->SetSound(Sound); Component->SetVolumeMultiplier(Volume);
    Component->SetupAttachment(RootComponent); Component->RegisterComponent();
    return Component;
}
void ADhakaAudioDirector::UpdateLoop(UAudioComponent* Component,USoundBase* Sound,bool bShouldPlay,float Volume)
{
    if(!Component)return;
    if(Component->Sound!=Sound)Component->SetSound(Sound);
    Component->SetVolumeMultiplier(FMath::Clamp(Volume,0.f,1.f));
    if(bShouldPlay&&Sound){if(!Component->IsPlaying())Component->Play();}
    else if(Component->IsPlaying())Component->Stop();
}
void ADhakaAudioDirector::Tick(float DeltaSeconds)
{
    Super::Tick(DeltaSeconds);
    APawn* PlayerPawn=UGameplayStatics::GetPlayerPawn(this,0);
    if(!PlayerPawn)return;
    SetActorLocation(PlayerPawn->GetActorLocation());
    const float Speed=PlayerPawn->GetVelocity().Size();
    UpdateLoop(TrafficAudio,CityTrafficLoop,true,AmbienceVolume);
    const FVector PlayerLocation=PlayerPawn->GetActorLocation();
    const FVector MarketZones[]={FVector(-85000.f,100000.f,0.f),FVector(-50000.f,-50000.f,0.f),FVector(25000.f,25000.f,0.f),FVector(75000.f,45000.f,0.f)};
    bool bNearMarket=false;
    for(const FVector& Zone:MarketZones)if(FVector::Dist2D(PlayerLocation,Zone)<22000.f){bNearMarket=true;break;}
    UpdateLoop(MarketAudio,MarketLoop,bNearMarket,AmbienceVolume*0.8f);
    bool bWeatherRain=bRainEnabled;
    for(TActorIterator<ADhakaWeatherController> It(GetWorld());It;++It)
    { if(It->RainIntensity>0.05f){bWeatherRain=true;break;} }
    UpdateLoop(RainAudio,RainLoop,bWeatherRain,AmbienceVolume);
    const bool bNearRiverfront=FMath::Abs(PlayerPawn->GetActorLocation().X-135000.f)<18000.f;
    UpdateLoop(RiverAudio,RiverfrontLoop,bNearRiverfront,AmbienceVolume*0.7f);
    UpdateLoop(EngineAudio,EngineLoop,PlayerPawn->IsA(ADhakaVehiclePawn::StaticClass())&&Speed>10.f,AmbienceVolume);
    bool bEmergencyNearby=false;
    for(TActorIterator<ADhakaTrafficVehicle> It(GetWorld());It;++It)
    {
        if(It->VehicleType==EDhakaTrafficVehicleType::Emergency && FVector::DistSquared2D(PlayerLocation,It->GetActorLocation())<FMath::Square(8500.f))
        {bEmergencyNearby=true;break;}
    }
    UpdateLoop(SirenAudio,EmergencySirenLoop,bEmergencyNearby,OneShotVolume);
}
void ADhakaAudioDirector::PlayOneShot(USoundBase* Sound,float Volume)
{
    if(!Sound)return;
    APawn* PlayerPawn=UGameplayStatics::GetPlayerPawn(this,0);
    UGameplayStatics::PlaySoundAtLocation(this,Sound,PlayerPawn?PlayerPawn->GetActorLocation():GetActorLocation(),FMath::Clamp(Volume,0.f,1.f));
}
void ADhakaAudioDirector::PlayHorn(){PlayOneShot(HornOneShot,OneShotVolume);}
void ADhakaAudioDirector::PlayRickshawBell(){PlayOneShot(RickshawBellOneShot,OneShotVolume);}
void ADhakaAudioDirector::PlayVendorCall(){PlayOneShot(VendorOneShot,OneShotVolume*0.65f);}
void ADhakaAudioDirector::SetRainAmbienceEnabled(bool bEnabled){bRainEnabled=bEnabled;}
void ADhakaAudioDirector::PlayThunder(){if(ThunderOneShot)UGameplayStatics::PlaySoundAtLocation(this,ThunderOneShot,GetActorLocation(),OneShotVolume);}
