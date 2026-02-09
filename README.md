# Qikify Custom Checkout App Setup

This guide outlines the steps to set up and deploy a custom checkout app for a merchant using Qikify. Follow the instructions below to ensure a smooth setup process.

## 1. Read Merchant Requirements

- Determine the extension types needed based on the merchant's requirements:
  - Checkout UI Extension
  - Discount Function
  - Delivery/Payment Customization Function

## 2. Create an App at Qikify Partner

1. Create a new app with the following naming convention: `Qikify CO Custom - Store Name`.
2. Choose `private` distribution.
3. Use the admin link of the merchant's store to generate the install link.
4. Check out to the `setup/install-custom-app` branch and run `yarn` to install dependencies.
5. Copy the generated link, open a new tab, and install the custom app on the merchant's store.

## 3. Create a New Branch

- Checkout from the `dev` branch to create a new branch with the name `custom/merchant-store-name`.

## 4. Remove Unused Extensions

- Delete any unused extensions from the `extensions` folder. Optionally, you can remove the entire folder if not needed.

## 5. Generate New Extensions

- Use the following command to create new UI extensions, discount functions, or delivery/payment customization functions:

  ```bash
  yarn shopify app generate extension

## 6. Configure Environment Variables

1. Copy `env.example` to `env`
2. Add `SHOPIFY_API_KEY` from your staging app

## 7. Connect to Staging App
- Use the following command to connect to your staging app

  ```bash
  yarn dev --reset

## 8. Deploy to Staging App
- Use the following command to deploy to your staging app

  ```bash
  yarn deploy
  #or
  yarn deploy --reset

## 9. Final Checks
1. After finished develop progress, create a draft checkout
2. Add your extension to that draft checkout and re-check again.

## NOTE: the data of ui extension come from shop metafield, if you can't read that data, please check `namespace` from `shopify.ui.toml` file and at `.env`
