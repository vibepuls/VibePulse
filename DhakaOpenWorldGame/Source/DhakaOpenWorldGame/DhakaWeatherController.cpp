#include "DhakaWeatherController.h"
#include "DhakaRainEffect.h"
#include "Components/ExponentialHeightFogComponent.h"
#include "Components/SceneComponent.h"
#include "Components/PointLightComponent.h"
#include "DhakaAudioDirector.h"
#include "EngineUtils.h"
#include "Engine/World.h"
#include "GameFramework/Pawn.h"
#include "Kismet/GameplayStatics.h"
#include "Engine/DirectionalLight.h"
#include "Engine/Light.h"

ADhakaWeatherController::ADhakaWeatherController()
{
    PrimaryActorTick.bCanEverTick=true; Root=CreateDefaultSubobject<USceneComponent>(TEXT("Root"));SetRootComponent(Root);
    Fog=CreateDefaultSubobject<UExponentialHeightFogComponent>(TEXT("Fog"));Fog->SetupAttachment(Root);Fog->SetFogDensity(0.012f);
    LightningLight=CreateDefaultSubobject<UPointLightComponent>(TEXT("MonsoonLightning"));LightningLight->SetupAttachment(Root);LightningLight->SetIntensity(0.f);LightningLight->SetAttenuationRadius(120000.f);LightningLight->SetLightColor(FLinearColor(.72f,.82f,1.f));LightningLight->SetCastShadows(false);
}
void ADhakaWeatherController::BeginPlay()
{
    Super::BeginPlay();
    if(GetWorld())
    {
        RainEffect=GetWorld()->SpawnActor<ADhakaRainEffect>(ADhakaRainEffect::StaticClass(),GetActorLocation(),FRotator::ZeroRotator);
        if(RainEffect)RainEffect->SetRainIntensity(RainIntensity);
    }
    ApplyEnvironment();
}
void ADhakaWeatherController::SetWeather(EDhakaWeather NewWeather)
{
    Weather=NewWeather;
    RainIntensity=(Weather==EDhakaWeather::Rain?0.45f:Weather==EDhakaWeather::Monsoon?1.f:0.f);
    if(RainEffect)RainEffect->SetRainIntensity(RainIntensity);
    ApplyEnvironment();
}
void ADhakaWeatherController::SetTimeOfDay(float Hours){TimeOfDayHours=FMath::IsFinite(Hours)?FMath::Fmod(FMath::Abs(Hours),24.f):12.f;ApplyEnvironment();}
void ADhakaWeatherController::Tick(float Dt)
{
    Super::Tick(Dt);
    RainIntensity=FMath::Clamp(RainIntensity,0.f,1.f);
    if(RainEffect && !FMath::IsNearlyEqual(RainEffect->Intensity,RainIntensity,0.02f))
        RainEffect->SetRainIntensity(RainIntensity);
    if(Weather!=EDhakaWeather::Monsoon)
    {
        LightningCountdown=FMath::FRandRange(7.f,17.f);
        LightningFlashRemaining=0.f;
        if(LightningLight)LightningLight->SetIntensity(0.f);
        return;
    }
    if(LightningFlashRemaining>0.f)
    {
        LightningFlashRemaining-=Dt;
        if(LightningFlashRemaining<=0.f && LightningLight)LightningLight->SetIntensity(0.f);
    }
    LightningCountdown-=Dt;
    if(LightningCountdown<=0.f && LightningFlashRemaining<=0.f)
    {
        LightningCountdown=FMath::FRandRange(8.f,22.f);
        LightningFlashRemaining=.12f;
        if(APawn* Player=UGameplayStatics::GetPlayerPawn(this,0))
        {
            SetActorLocation(Player->GetActorLocation());
            if(LightningLight)LightningLight->SetIntensity(FMath::FRandRange(2500000.f,6500000.f));
        }
        for(TActorIterator<ADhakaAudioDirector> It(GetWorld());It;++It){It->PlayThunder();break;}
    }
}
void ADhakaWeatherController::ApplyEnvironment()
{
    if(Fog){float Density=0.012f;if(Weather==EDhakaWeather::Smog)Density=0.035f;else if(Weather==EDhakaWeather::Rain)Density=0.02f;else if(Weather==EDhakaWeather::Monsoon)Density=0.045f;else if(Weather==EDhakaWeather::Fog)Density=0.06f;Fog->SetFogDensity(Density);}
    if(GetWorld()){TArray<AActor*> Lights;UGameplayStatics::GetAllActorsOfClass(GetWorld(),ADirectionalLight::StaticClass(),Lights);const float Day=FMath::Clamp(FMath::Sin((TimeOfDayHours-6.f)/12.f*PI),0.08f,1.f);const float Pitch=(TimeOfDayHours/24.f)*360.f-90.f;for(AActor* A:Lights)if(ALight* L=Cast<ALight>(A)){L->SetBrightness(Weather==EDhakaWeather::Monsoon?Day*1.5f:Day*4.f);A->SetActorRotation(FRotator(Pitch,-32.f,0.f));}}
}

void ADhakaWeatherController::CycleWeather()
{
    const int32 Next=(static_cast<int32>(Weather)+1)%5;
    SetWeather(static_cast<EDhakaWeather>(Next));
}
void ADhakaWeatherController::AdvanceTimeOfDay()
{
    SetTimeOfDay(TimeOfDayHours+3.f);
}
