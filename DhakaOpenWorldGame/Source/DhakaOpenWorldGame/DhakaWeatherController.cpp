#include "DhakaWeatherController.h"
#include "Components/ExponentialHeightFogComponent.h"
#include "Components/SceneComponent.h"
#include "Engine/World.h"
#include "Kismet/GameplayStatics.h"
#include "Engine/DirectionalLight.h"
#include "Engine/Light.h"

ADhakaWeatherController::ADhakaWeatherController()
{
    PrimaryActorTick.bCanEverTick=true; Root=CreateDefaultSubobject<USceneComponent>(TEXT("Root"));SetRootComponent(Root);
    Fog=CreateDefaultSubobject<UExponentialHeightFogComponent>(TEXT("Fog"));Fog->SetupAttachment(Root);Fog->SetFogDensity(0.012f);
}
void ADhakaWeatherController::SetWeather(EDhakaWeather NewWeather){Weather=NewWeather;RainIntensity=(Weather==EDhakaWeather::Rain?0.45f:Weather==EDhakaWeather::Monsoon?1.f:0.f);ApplyEnvironment();}
void ADhakaWeatherController::SetTimeOfDay(float Hours){TimeOfDayHours=FMath::Fmod(FMath::Abs(Hours),24.f);ApplyEnvironment();}
void ADhakaWeatherController::Tick(float Dt){Super::Tick(Dt);if(Weather==EDhakaWeather::Rain||Weather==EDhakaWeather::Monsoon){RainIntensity=FMath::Clamp(RainIntensity,0.f,1.f);}}
void ADhakaWeatherController::ApplyEnvironment()
{
    if(Fog){float Density=0.012f;if(Weather==EDhakaWeather::Smog)Density=0.035f;else if(Weather==EDhakaWeather::Rain)Density=0.02f;else if(Weather==EDhakaWeather::Monsoon)Density=0.045f;else if(Weather==EDhakaWeather::Fog)Density=0.06f;Fog->SetFogDensity(Density);}
    if(GetWorld()){TArray<AActor*> Lights;UGameplayStatics::GetAllActorsOfClass(GetWorld(),ADirectionalLight::StaticClass(),Lights);const float Day=FMath::Clamp(FMath::Sin((TimeOfDayHours-6.f)/12.f*PI),0.08f,1.f);const float Pitch=(TimeOfDayHours/24.f)*360.f-90.f;for(AActor* A:Lights)if(ALight* L=Cast<ALight>(A)){L->SetBrightness(Weather==EDhakaWeather::Monsoon?Day*1.5f:Day*4.f);A->SetActorRotation(FRotator(Pitch,-32.f,0.f));}}
}
