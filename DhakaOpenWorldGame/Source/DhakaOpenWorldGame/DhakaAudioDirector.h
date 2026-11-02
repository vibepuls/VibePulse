#pragma once
#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DhakaAudioDirector.generated.h"
class UAudioComponent;
class USoundBase;

UCLASS()
class DHAKAOPENWORLDGAME_API ADhakaAudioDirector : public AActor
{
    GENERATED_BODY()
public:
    ADhakaAudioDirector();
    virtual void Tick(float DeltaSeconds) override;
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Dhaka Audio|Ambience") TObjectPtr<USoundBase> CityTrafficLoop = nullptr;
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Dhaka Audio|Ambience") TObjectPtr<USoundBase> MarketLoop = nullptr;
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Dhaka Audio|Ambience") TObjectPtr<USoundBase> RainLoop = nullptr;
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Dhaka Audio|Ambience") TObjectPtr<USoundBase> RiverfrontLoop = nullptr;
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Dhaka Audio|Vehicles") TObjectPtr<USoundBase> EngineLoop = nullptr;
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Dhaka Audio|Vehicles") TObjectPtr<USoundBase> EmergencySirenLoop = nullptr;
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Dhaka Audio|Vehicles") TObjectPtr<USoundBase> HornOneShot = nullptr;
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Dhaka Audio|Street Life") TObjectPtr<USoundBase> RickshawBellOneShot = nullptr;
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Dhaka Audio|Street Life") TObjectPtr<USoundBase> VendorOneShot = nullptr;
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Dhaka Audio|Weather") TObjectPtr<USoundBase> ThunderOneShot = nullptr;
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Dhaka Audio") float AmbienceVolume = 0.35f;
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Dhaka Audio") float OneShotVolume = 0.8f;
    UFUNCTION(BlueprintCallable, Category="Dhaka Audio") void PlayHorn();
    UFUNCTION(BlueprintCallable, Category="Dhaka Audio") void PlayRickshawBell();
    UFUNCTION(BlueprintCallable, Category="Dhaka Audio") void PlayVendorCall();
    UFUNCTION(BlueprintCallable, Category="Dhaka Audio") void PlayThunder();
    UFUNCTION(BlueprintCallable, Category="Dhaka Audio") void SetRainAmbienceEnabled(bool bEnabled);
protected:
    virtual void BeginPlay() override;
private:
    UPROPERTY(Transient) TObjectPtr<UAudioComponent> TrafficAudio = nullptr;
    UPROPERTY(Transient) TObjectPtr<UAudioComponent> MarketAudio = nullptr;
    UPROPERTY(Transient) TObjectPtr<UAudioComponent> RainAudio = nullptr;
    UPROPERTY(Transient) TObjectPtr<UAudioComponent> RiverAudio = nullptr;
    UPROPERTY(Transient) TObjectPtr<UAudioComponent> EngineAudio = nullptr;
    UPROPERTY(Transient) TObjectPtr<UAudioComponent> SirenAudio = nullptr;
    bool bRainEnabled = false;
    UAudioComponent* CreateLoop(const TCHAR* Name, USoundBase* Sound, float Volume);
    void UpdateLoop(UAudioComponent* Component, USoundBase* Sound, bool bShouldPlay, float Volume);
    void PlayOneShot(USoundBase* Sound, float Volume);
};