#include "DhakaAudioDirector.h"
#include "DhakaVehiclePawn.h"
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
    UpdateLoop(MarketAudio,MarketLoop,true,AmbienceVolume*0.8f);
    UpdateLoop(RainAudio,RainLoop,bRainEnabled,AmbienceVolume);
    UpdateLoop(RiverAudio,RiverfrontLoop,false,AmbienceVolume*0.7f);
    UpdateLoop(EngineAudio,EngineLoop,PlayerPawn->IsA(ADhakaVehiclePawn::StaticClass())&&Speed>10.f,AmbienceVolume);
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