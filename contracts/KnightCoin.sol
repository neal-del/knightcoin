// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title KnightCoin (KC)
 * @notice ERC-20 token for the Menlo School prediction market.
 *         Deployed on Sepolia testnet — has zero real-world value.
 *
 *  - Owner (admin) can mint tokens to any address.
 *  - Owner can bulk-airdrop to a list of addresses.
 *  - Students deposit KC into the prediction market app and
 *    withdraw winnings back to their wallet.
 *  - 18 decimals (standard).
 */
contract KnightCoin is ERC20, Ownable {

    /// @notice Emitted when the owner mints tokens.
    event Minted(address indexed to, uint256 amount);

    /// @notice Emitted when a user deposits KC into the prediction market.
    event Deposited(address indexed user, uint256 amount);

    /// @notice Emitted when the market returns KC to a user (withdrawal).
    event Withdrawn(address indexed user, uint256 amount);

    /// @notice The prediction market contract/address allowed to
    ///         execute deposits and withdrawals on behalf of users.
    address public marketAddress;

    constructor() ERC20("KnightCoin", "KC") Ownable(msg.sender) {
        // Mint initial supply to the deployer (admin).
        // 1,000,000 KC — enough for the whole school.
        _mint(msg.sender, 1_000_000 * 10 ** decimals());
    }

    /// @notice Admin mints new KC to a specific address.
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
        emit Minted(to, amount);
    }

    /// @notice Admin bulk-airdrops the same amount to many addresses.
    function airdrop(address[] calldata recipients, uint256 amount) external onlyOwner {
        for (uint256 i = 0; i < recipients.length; i++) {
            _mint(recipients[i], amount);
            emit Minted(recipients[i], amount);
        }
    }

    /// @notice Admin sets the prediction market address (can call deposit/withdraw).
    function setMarketAddress(address _market) external onlyOwner {
        marketAddress = _market;
    }
}
