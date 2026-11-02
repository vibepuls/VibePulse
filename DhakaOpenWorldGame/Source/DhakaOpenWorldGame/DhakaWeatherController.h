#pragma once
#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DhakaWeatherController.generated.h"

class ADhakaRainEffect;

UENUM(BlueprintType)
enum class EDhakaWeather : uint8 { Clear, Smog, Rain, Monsoon, Fog };

UCLASS()
class DHAKAOPENWORLDGAME_API ADhakaWeatherController : public AActor
{
    GENERATED_BODY()
public:
    ADhakaWeatherController();
    virtual void BeginPlay() override;
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Weather") EDhakaWeather Weather = EDhakaWeather::Clear;
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Time", meta=(ClampMin="0",ClampMax="24")) float TimeOfDayHours = 14.f;
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Weather") float RainIntensity = 0.f;
    UFUNCTION(BlueprintCallable) void SetWeather(EDhakaWeather NewWeather);
    UFUNCTION(BlueprintCallable) void SetTimeOfDay(float Hours);
    UFUNCTION(BlueprintCallable) void CycleWeather();
    UFUNCTION(BlueprintCallable) void AdvanceTimeOfDay();
    virtual void Tick(float DeltaSeconds) override;
private:
    void ApplyEnvironment();
    UPROPERTY() TObjectPtr<class UExponentialHeightFogComponent> Fog;
    UPROPERTY() TObjectPtr<class USceneComponent> Root;
    UPROPERTY() TObjectPtr<ADhakaRainEffect> RainEffect;
};
