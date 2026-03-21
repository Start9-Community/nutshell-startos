# Nutshell Cashu Mint

Nutshell is an implementation of a Cashu mint and wallet. Cashu is a Chaumian Ecash system for Bitcoin.

## Configuration

### Mint Information
- **Name**: A descriptive name for your sovereign mint.
- **Description**: A short description of your mint.

### Lightning Backend
- **Core Lightning (Internal RPC)**: Connects to the internal `c-lightning` service on your StartOS.
- **Fake Wallet**: For testing purposes only. No real bitcoin is used.
- **LNbits**: Connects to a remote LNbits instance.

### Fees
- **Fee Percentage**: The percentage fee for Lightning invoices (e.g., 0.01 for 1%).
- **Minimum Fee Reserve**: The minimum satoshi fee reserve for outgoing payments.

## Usage

Once the service is started, you can connect your Cashu wallet to the Mint API interface.
The mint uses port 3338 by default.
