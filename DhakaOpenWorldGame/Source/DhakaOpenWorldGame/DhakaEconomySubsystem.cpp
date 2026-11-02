#include "DhakaEconomySubsystem.h"
#include "DhakaEconomySaveGame.h"
#include "DhakaMissionSubsystem.h"
#include "Kismet/GameplayStatics.h"
#include "Engine/GameInstance.h"

namespace
{
    const TCHAR* DhakaEconomySlot=TEXT("DhakaEconomySlot");
    constexpr int32 DhakaEconomyUser=0;
}

void UDhakaEconomySubsystem::Initialize(FSubsystemCollectionBase& Collection)
{
    Super::Initialize(Collection);
    BuildCatalog();
    LoadEconomy();
}

void UDhakaEconomySubsystem::BuildCatalog()
{
    ShopCatalog.Reset();
    auto AddItem=[this](FName Id,const TCHAR* Name,const TCHAR* Description,int32 Price,int32 SellPrice)
    {
        FDhakaShopItem Item;Item.Id=Id;Item.Name=FText::FromString(Name);Item.Description=FText::FromString(Description);Item.Price=Price;Item.SellPrice=SellPrice;ShopCatalog.Add(Item);
    };
    AddItem("water_bottle",TEXT("Water Bottle"),TEXT("A bottle of drinking water."),30,10);
    AddItem("street_snack",TEXT("Street Snack"),TEXT("A quick snack from a roadside stall."),60,20);
    AddItem("first_aid",TEXT("First Aid Kit"),TEXT("Basic first aid supplies."),250,80);
    AddItem("phone_data",TEXT("Mobile Data Pack"),TEXT("A prepaid mobile data pack."),120,0);
    AddItem("fuel_can",TEXT("Fuel Can"),TEXT("Emergency fuel for a long trip."),450,150);
    AddItem("repair_kit",TEXT("Vehicle Repair Kit"),TEXT("A small roadside repair kit."),800,250);

    PropertyCatalog.Reset();
    auto AddProperty=[this](FName Id,const TCHAR* Name,const TCHAR* District,int64 Price,int64 Income)
    {
        FDhakaPropertyOffer Offer;Offer.Id=Id;Offer.Name=FText::FromString(Name);Offer.District=FText::FromString(District);Offer.Price=Price;Offer.DailyIncome=Income;PropertyCatalog.Add(Offer);
    };
    AddProperty("old_dhaka_shop",TEXT("Old Dhaka Shop"),TEXT("Old Dhaka"),85000,250);
    AddProperty("dhanmondi_flat",TEXT("Dhanmondi Apartment"),TEXT("Dhanmondi"),420000,1200);
    AddProperty("uttara_garage",TEXT("Uttara Garage"),TEXT("Uttara"),650000,1800);
    AddProperty("gulshan_office",TEXT("Gulshan Office"),TEXT("Gulshan"),1500000,4200);
}

bool UDhakaEconomySubsystem::PurchaseItem(FName ItemId,int32 Quantity)
{
    Quantity=FMath::Clamp(Quantity,1,99);
    const FDhakaShopItem* Item=ShopCatalog.FindByPredicate([ItemId](const FDhakaShopItem& Candidate){return Candidate.Id==ItemId;});
    UDhakaMissionSubsystem* Missions=GetGameInstance()?GetGameInstance()->GetSubsystem<UDhakaMissionSubsystem>():nullptr;
    if(!Item||!Missions)return false;
    const int64 Cost=static_cast<int64>(Item->Price)*Quantity;
    if(Cost<0||Missions->Wallet<Cost)return false;
    Missions->AddWallet(-Cost);
    Inventory.FindOrAdd(ItemId)=FMath::Clamp(Inventory.FindRef(ItemId)+Quantity,0,999);
    SaveEconomy();
    return true;
}

bool UDhakaEconomySubsystem::SellItem(FName ItemId,int32 Quantity)
{
    Quantity=FMath::Clamp(Quantity,1,99);
    const FDhakaShopItem* Item=ShopCatalog.FindByPredicate([ItemId](const FDhakaShopItem& Candidate){return Candidate.Id==ItemId;});
    UDhakaMissionSubsystem* Missions=GetGameInstance()?GetGameInstance()->GetSubsystem<UDhakaMissionSubsystem>():nullptr;
    if(!Item||Item->SellPrice<=0||!Missions||Inventory.FindRef(ItemId)<Quantity)return false;
    Inventory[ItemId]-=Quantity;
    if(Inventory[ItemId]<=0)Inventory.Remove(ItemId);
    Missions->AddWallet(static_cast<int64>(Item->SellPrice)*Quantity);
    SaveEconomy();
    return true;
}

bool UDhakaEconomySubsystem::UseItem(FName ItemId,int32 Quantity)
{
    Quantity=FMath::Clamp(Quantity,1,99);
    if(Inventory.FindRef(ItemId)<Quantity)return false;
    Inventory[ItemId]-=Quantity;
    if(Inventory[ItemId]<=0)Inventory.Remove(ItemId);
    SaveEconomy();
    return true;
}

bool UDhakaEconomySubsystem::PurchaseProperty(FName PropertyId)
{
    const FDhakaPropertyOffer* Offer=PropertyCatalog.FindByPredicate([PropertyId](const FDhakaPropertyOffer& Candidate){return Candidate.Id==PropertyId;});
    UDhakaMissionSubsystem* Missions=GetGameInstance()?GetGameInstance()->GetSubsystem<UDhakaMissionSubsystem>():nullptr;
    if(!Offer||!Missions||OwnsProperty(PropertyId)||Offer->Price<0||Missions->Wallet<Offer->Price)return false;
    Missions->AddWallet(-Offer->Price);
    OwnedProperties.AddUnique(PropertyId);
    AwardExperience(250);
    SaveEconomy();
    return true;
}

bool UDhakaEconomySubsystem::OwnsProperty(FName PropertyId) const
{
    return OwnedProperties.Contains(PropertyId);
}

void UDhakaEconomySubsystem::AwardExperience(int64 Amount)
{
    if(Amount<=0)return;
    Experience=FMath::Min<int64>(MAX_int64,Experience+Amount);
    while(PlayerLevel<1000&&Experience>=static_cast<int64>(PlayerLevel)*500)
    {
        Experience-=static_cast<int64>(PlayerLevel)*500;
        ++PlayerLevel;
    }
    SaveEconomy();
}

int64 UDhakaEconomySubsystem::ClaimPropertyIncome()
{
    const FDateTime Now=FDateTime::UtcNow();
    if(LastIncomeClaimUtc.GetTicks()>0 && Now-LastIncomeClaimUtc<FTimespan::FromHours(24.0))return 0;
    int64 Income=0;
    for(const FName PropertyId:OwnedProperties)
    {
        const FDhakaPropertyOffer* Offer=PropertyCatalog.FindByPredicate([PropertyId](const FDhakaPropertyOffer& Candidate){return Candidate.Id==PropertyId;});
        if(Offer)Income=FMath::Min<int64>(MAX_int64,Income+FMath::Max<int64>(0,Offer->DailyIncome));
    }
    if(Income<=0)return 0;
    UDhakaMissionSubsystem* Missions=GetGameInstance()?GetGameInstance()->GetSubsystem<UDhakaMissionSubsystem>():nullptr;
    if(!Missions)return 0;
    LastIncomeClaimUtc=Now;
    Missions->AddWallet(Income);
    SaveEconomy();
    return Income;
}

bool UDhakaEconomySubsystem::SaveEconomy()
{
    UDhakaEconomySaveGame* Save=Cast<UDhakaEconomySaveGame>(UGameplayStatics::CreateSaveGameObject(UDhakaEconomySaveGame::StaticClass()));
    if(!Save)return false;
    Save->Inventory=Inventory;Save->OwnedProperties=OwnedProperties;Save->PlayerLevel=PlayerLevel;Save->Experience=Experience;Save->LastIncomeClaimUtc=LastIncomeClaimUtc;
    return UGameplayStatics::SaveGameToSlot(Save,DhakaEconomySlot,DhakaEconomyUser);
}

bool UDhakaEconomySubsystem::LoadEconomy()
{
    if(!UGameplayStatics::DoesSaveGameExist(DhakaEconomySlot,DhakaEconomyUser))return false;
    UDhakaEconomySaveGame* Save=Cast<UDhakaEconomySaveGame>(UGameplayStatics::LoadGameFromSlot(DhakaEconomySlot,DhakaEconomyUser));
    if(!Save||Save->Version!=2)return false;
    Inventory=Save->Inventory;OwnedProperties=Save->OwnedProperties;
    PlayerLevel=FMath::Clamp(Save->PlayerLevel,1,1000);Experience=FMath::Max<int64>(0,Save->Experience);LastIncomeClaimUtc=Save->LastIncomeClaimUtc;
    return true;
}
