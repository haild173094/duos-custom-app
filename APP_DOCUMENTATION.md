# Dineamic Custom App - Documentation

## Overview
**Qikify CO Custom - Dineamic-T** is a bespoke Shopify application designed to enhance the checkout experience for Dineamic. It leverages Shopify's Checkout UI Extensions to provide custom logic for delivery scheduling, cart modifications, and subscription management.

## Architecture
- **Framework**: Shopify CLI 3.x
- **Frontend**: React with Shopify Polaris and UI Extensions API.
- **Backend**: Node.js (Express-based) for Shopify Admin app logic.
- **Styling**: Vanilla CSS / Polaris.

### Metafields & Namespaces
The app heavily relies on Shopify Metafields for configuration:
- **Primary Namespace**: `qikify_checkout`
- **Delivery Namespace**: `din_ops`
- **Data Key**: `data` (used in `configs/app.js`)

### Technical Extension Deep-Dive

#### 1. Delivery Date Time & Wholesale
- **Handle**: `delivery-date-time`, `delivery-date-time-wholesale`
- **Metadata**:
  - **Metaobjects**: `be_cool_delivery_date_and_time`, `be_cool_delivery_date_and_time_2`.
  - **Fields**: `zone_name`, `postcode_suburb_list` (JSON), `delivery_schedule` (JSON), `blackout_dates` (JSON), `days_to_display`.
- **Configuration (Settings)**:
  - `overnightImageUrl`, `middayImageUrl`: URLs for slot selection icons.
- **Logic**:
  - **Zone Matching**: Matches the customer's postcode against the `postcode_suburb_list` in fetched metaobjects.
  - **Calendar Generation**: Dynamically builds a list of available dates based on the `delivery_schedule` (including cut-off times and lead times).
  - **Exclusion**: Hides if the cart contains a gift card (standard) or a bulk bag (wholesale).

#### 2. Custom Cart (Upsell & Options)
- **Handle**: `custom-cart`
- **Metadata**:
  - **Metafields**: `qikify_checkout.custom_fields_translation` (namespace defined in configs).
- **Configuration (Settings)**:
  - `change_variant`, `change_quantity`: Toggles for UI editing capabilities.
  - `show_discount`: Enables quantity-based upsell buttons.
  - `show_upsell_selling_plan`: Enables subscription upsell for line items.
- **Logic**:
  - **Volume Upsell**: Scans `appConfig.shopify_discounts` to find the next tier discount for the current product and offers a one-click "Add More" button.
  - **Integration**: Works with `Globo Product Options` if configured.
  - **Analytics**: Tracks viewing and clicking of upsell offers via `_qikify-checkout-cc` attribute.

#### 3. Delivery Instructions
- **Handle**: `delivery-instructions`
- **Metadata**:
  - **Metafields**: Namespace: `qikify_checkout`. Keys are dynamic based on the field IDs in `entriesData`.
- **Logic**:
  - **Dynamic Form**: Fetches form schema from `entriesData` (identified by `custom_field_entry_id`).
  - **Interception**: Blocks "Pay Now" if a required instruction hasn't been selected.
  - **Persistence**: Saves choices and notes directly to order metafields.

#### 4. Change Subscription
- **Handle**: `change-subscription`
- **Metadata**:
  - **Metaobjects**: `din_config` (contains `mealTypes` and `overrideDiscounts`).
- **Logic**:
  - **Meal Amount**: Calculates the total value of products matching `mealTypes`.
  - **Dynamic Tiers**: Parses setting strings like `[SUB6>=80]` to apply specific discount codes based on the meal amount.
  - **Interception**: Prevents checkout if subscription options are inconsistent or missing.

#### 5. Carbon Offsets
- **Handle**: `carbon-offsets`
- **Logic**:
  - **Calculations**:
    - Plastic saved: `Ready Meal` quantity * 25g.
    - Carbon offset: Total relevant quantity * 1.227g.
  - **Display**: Shows environmental impact statistics on Checkout and Thank You pages.

#### 6. Post-Purchase Referral (Custom Button)
- **Handle**: `custom-button-ty`
- **Metadata**:
  - **Metafield**: `din_referral.invite_link` (Customer/Order level).
- **Logic**:
  - Fetches individual customer referral links and injects them into button URLs.
  - Uses conditional display based on customer tags fetched via backend API.

#### 7. Error Handling (Pay Now Intercept)
- **Handle**: `pay-now-error`, `pay-now-error-whole-sale`
- **Logic**:
  - **Validation**: Checks for missing `delivery_date` or unselected `selling_plans`.
  - **Blocking**: Explicitly blocks the purchase flow and displays contact info if requirements aren't met, ensuring data integrity for fulfillment.

## Core Shared Logic

### `useCheckoutData` Hook
Located in `hooks/useCheckoutData.js`, this is the central data layer for all extensions. It provides:
- **Reactive State**: Synchronizes with Shopify's checkout state (shipping address, payment options, totals).
- **Product Enrichment**: Fetches additional product data (tags, collections) via the Storefront API.
- **Rate Calculation**: Handles currency conversion and pricing logic.
- **Customer Context**: Retrieves customer-specific tags for conditional logic.
