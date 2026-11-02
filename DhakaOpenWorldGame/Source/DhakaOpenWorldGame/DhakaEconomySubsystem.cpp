#include "DhakaEconomySubsystem.h"
#include "DhakaEconomySaveGame.h"
#include "DhakaMissionSubsystem.h"
#include "DhakaPlayerCharacter.h"
#include "DhakaVehiclePawn.h"
#include "Engine/World.h"
#include "EngineUtils.h"
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
    AddItem("tea_cup",TEXT("Cha (Tea)"),TEXT("Hot tea from a roadside cha stall."),20,5);
    AddItem("fuchka_plate",TEXT("Fuchka Plate"),TEXT("Fuchka from a street vendor."),100,30);
    AddItem("jhalmuri_packet",TEXT("Jhalmuri"),TEXT("A spicy puffed-rice snack."),50,15);
    AddItem("fruit_bag",TEXT("Fruit Bag"),TEXT("Fresh seasonal fruit."),80,25);
    AddItem("chotpoti_plate",TEXT("Chotpoti Plate"),TEXT("A spicy chickpea and potato street-food plate."),90,28);
    AddItem("vegetable_bag",TEXT("Vegetable Bag"),TEXT("Fresh vegetables from a footpath produce seller."),70,22);
    AddItem("clothing_bundle",TEXT("Clothing Bundle"),TEXT("Affordable everyday clothing from a street stall."),350,100);
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
    if(!Item||Item->Price<0||!Missions){LastTransactionMessage=FText::FromString(TEXT("Purchase failed: item or wallet unavailable."));return false;}
    const int32 CurrentQuantity=FMath::Clamp(Inventory.FindRef(ItemId),0,999);
    const int32 AvailableCapacity=999-CurrentQuantity;
    if(AvailableCapacity<=0){LastTransactionMessage=FText::FromString(TEXT("Inventory full: sell or use some items first."));return false;}
    // Charge only for items that actually fit; never silently discard purchased stock.
    Quantity=FMath::Min(Quantity,AvailableCapacity);
    const int64 Cost=static_cast<int64>(Item->Price)*Quantity;
    if(Cost<0||Missions->Wallet<Cost){LastTransactionMessage=FText::FromString(TEXT("Not enough money for this purchase."));return false;}
    Missions->AddWallet(-Cost);
    Inventory.FindOrAdd(ItemId)=CurrentQuantity+Quantity;
    LastTransactionMessage=FText::Format(NSLOCTEXT("DhakaEconomy","PurchaseSuccess","Purchased {0} x{1}."),Item->Name,FText::AsNumber(Quantity));
    SaveEconomy();
    return true;
}

bool UDhakaEconomySubsystem::SellItem(FName ItemId,int32 Quantity)
{
    Quantity=FMath::Clamp(Quantity,1,99);
    const FDhakaShopItem* Item=ShopCatalog.FindByPredicate([ItemId](const FDhakaShopItem& Candidate){return Candidate.Id==ItemId;});
    UDhakaMissionSubsystem* Missions=GetGameInstance()?GetGameInstance()->GetSubsystem<UDhakaMissionSubsystem>():nullptr;
    if(!Item||Item->SellPrice<=0||!Missions||Inventory.FindRef(ItemId)<Quantity){LastTransactionMessage=FText::FromString(TEXT("Cannot sell this item or quantity."));return false;}
    Inventory[ItemId]-=Quantity;
    if(Inventory[ItemId]<=0)Inventory.Remove(ItemId);
    Missions->AddWallet(static_cast<int64>(Item->SellPrice)*Quantity);
    LastTransactionMessage=FText::Format(NSLOCTEXT("DhakaEconomy","SaleSuccess","Sold {0} x{1}."),Item->Name,FText::AsNumber(Quantity));
    SaveEconomy();
    return true;
}

bool UDhakaEconomySubsystem::UseItem(FName ItemId,AActor* User)
{
    if(!User||Inventory.FindRef(ItemId)<=0)
    {
        LastTransactionMessage=FText::FromString(TEXT("Item unavailable: buy it first."));
        return false;
    }
    ADhakaPlayerCharacter* Character=Cast<ADhakaPlayerCharacter>(User);
    // Explicitly supplied/player-owned vehicle first; never search arbitrary AI traffic vehicles.
    ADhakaVehiclePawn* Vehicle=Cast<ADhakaVehiclePawn>(User);
    if(!Vehicle && Character && Character->NearbyVehicle
        && FVector::Dist2D(User->GetActorLocation(),Character->NearbyVehicle->GetActorLocation())<=550.f)
        Vehicle=Character->NearbyVehicle;
    if(!Vehicle)
    {
        APawn* PlayerPawn=UGameplayStatics::GetPlayerPawn(this,0);
        ADhakaVehiclePawn* PlayerVehicle=Cast<ADhakaVehiclePawn>(PlayerPawn);
        if(PlayerVehicle && FVector::Dist2D(User->GetActorLocation(),PlayerVehicle->GetActorLocation())<=550.f)
            Vehicle=PlayerVehicle;
    }
    bool bApplied=false;
    if(ItemId==TEXT("first_aid") && Character && Character->Health<100.f)
    {
        Character->Health=FMath::Min(100.f,Character->Health+45.f);
        LastTransactionMessage=FText::FromString(TEXT("First aid used: health restored."));
        bApplied=true;
    }
    else if((ItemId==TEXT("water_bottle")||ItemId==TEXT("street_snack")||ItemId==TEXT("tea_cup")||ItemId==TEXT("fuchka_plate")||ItemId==TEXT("jhalmuri_packet")||ItemId==TEXT("fruit_bag")) && Character && Character->Stamina<100.f)
    {
        const float Restore=ItemId==TEXT("water_bottle")?35.f:ItemId==TEXT("fruit_bag")?28.f:20.f;
        Character->Stamina=FMath::Min(100.f,Character->Stamina+Restore);
        LastTransactionMessage=FText::FromString(TEXT("Food/drink used: stamina restored."));
        bApplied=true;
    }
    else if(ItemId==TEXT("fuel_can") && Vehicle && Vehicle->FuelPercent<100.f)
    {
        Vehicle->AddFuel(55.f);
        LastTransactionMessage=FText::FromString(TEXT("Fuel can used: vehicle refuelled."));
        bApplied=true;
    }
    else if(ItemId==TEXT("repair_kit") && Vehicle && Vehicle->ConditionPercent<100.f)
    {
        Vehicle->RepairVehicle(40.f);
        LastTransactionMessage=FText::FromString(TEXT("Repair kit used: vehicle condition improved."));
        bApplied=true;
    }
    if(!bApplied)
    {
        LastTransactionMessage=FText::FromString(TEXT("Cannot use this item here or its effect is already full."));
        return false;
    }
    Inventory[ItemId]--;
    if(Inventory[ItemId]<=0)Inventory.Remove(ItemId);
    SaveEconomy();
    return true;
}

bool UDhakaEconomySubsystem::PurchaseProperty(FName PropertyId)
{
    const FDhakaPropertyOffer* Offer=PropertyCatalog.FindByPredicate([PropertyId](const FDhakaPropertyOffer& Candidate){return Candidate.Id==PropertyId;});
    UDhakaMissionSubsystem* Missions=GetGameInstance()?GetGameInstance()->GetSubsystem<UDhakaMissionSubsystem>():nullptr;
    if(!Offer||!Missions||OwnsProperty(PropertyId)||Offer->Price<0||Missions->Wallet<Offer->Price){LastTransactionMessage=FText::FromString(TEXT("Property purchase failed: already owned or insufficient funds."));return false;}
    Missions->AddWallet(-Offer->Price);
    OwnedProperties.AddUnique(PropertyId);
    LastTransactionMessage=FText::Format(NSLOCTEXT("DhakaEconomy","PropertyBought","Purchased property: {0}."),Offer->Name);
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
    Experience=Experience>MAX_int64-Amount?MAX_int64:Experience+Amount;
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
    if(LastIncomeClaimUtc.GetTicks()>0 && Now-LastIncomeClaimUtc<FTimespan::FromHours(24.0)){LastTransactionMessage=FText::FromString(TEXT("Property income is available once every 24 hours."));return 0;}
    int64 Income=0;
    for(const FName PropertyId:OwnedProperties)
    {
        const FDhakaPropertyOffer* Offer=PropertyCatalog.FindByPredicate([PropertyId](const FDhakaPropertyOffer& Candidate){return Candidate.Id==PropertyId;});
        if(Offer){const int64 PropertyIncome=FMath::Max<int64>(0,Offer->DailyIncome);Income=Income>MAX_int64-PropertyIncome?MAX_int64:Income+PropertyIncome;}
    }
    if(Income<=0){LastTransactionMessage=FText::FromString(TEXT("No owned property income to claim."));return 0;}
    UDhakaMissionSubsystem* Missions=GetGameInstance()?GetGameInstance()->GetSubsystem<UDhakaMissionSubsystem>():nullptr;
    if(!Missions)return 0;
    LastIncomeClaimUtc=Now;
    LastTransactionMessage=FText::Format(NSLOCTEXT("DhakaEconomy","IncomeClaimed","Claimed daily property income: {0}."),FText::AsNumber(Income));
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
    Inventory.Reset();
    for(const TPair<FName,int32>& SavedEntry:Save->Inventory)
    {
        if(SavedEntry.Key.IsNone()||SavedEntry.Value<=0)continue;
        const bool bKnownItem=ShopCatalog.ContainsByPredicate([&SavedEntry](const FDhakaShopItem& Item){return Item.Id==SavedEntry.Key;});
        if(!bKnownItem)continue;
        Inventory.Add(SavedEntry.Key,FMath::Clamp(SavedEntry.Value,0,999));
    }
    OwnedProperties.Reset();
    for(const FName SavedProperty:Save->OwnedProperties)
    {
        const bool bKnownProperty=PropertyCatalog.ContainsByPredicate([SavedProperty](const FDhakaPropertyOffer& Offer){return Offer.Id==SavedProperty;});
        if(bKnownProperty)OwnedProperties.AddUnique(SavedProperty);
    }
    PlayerLevel=FMath::Clamp(Save->PlayerLevel,1,1000);
    Experience=FMath::Max<int64>(0,Save->Experience);
    // Reconcile valid but inconsistent save data so XP thresholds cannot be bypassed
    // or leave the player permanently carrying multiple unprocessed levels.
    while(PlayerLevel<1000 && Experience>=static_cast<int64>(PlayerLevel)*500)
    {
        Experience-=static_cast<int64>(PlayerLevel)*500;
        ++PlayerLevel;
    }
    const FDateTime Now=FDateTime::UtcNow();
    LastIncomeClaimUtc=Save->LastIncomeClaimUtc;
    // A corrupt/future timestamp must not lock daily property income indefinitely.
    if(LastIncomeClaimUtc>Now)LastIncomeClaimUtc=Now;
    return true;
}
