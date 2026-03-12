// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import { SomniaEventHandler } from "@somnia-chain/reactivity-contracts/contracts/SomniaEventHandler.sol";

contract SafeVault is SomniaEventHandler {
    address public owner;
    uint256 public safetyThreshold;

    event ProtectionTriggered(uint256 price, address emitter, uint256 timestamp);
    event FundWithdrawn(address indexed by, uint256 amount, uint256 timestamp);
    event SafetyThresholdUpdated(uint256 oldThreshold, uint256 newThreshold, uint256 timestamp);

    modifier onlyOwner() {
        require(msg.sender == owner, "SafeVault: caller is not owner");
        _;
    }

    constructor(uint256 _threshold) {
        owner = msg.sender;
        safetyThreshold = _threshold;
    }

    function withdraw(uint256 amount) external onlyOwner {
        require(amount > 0, "SafeVault: amount must be > 0");
        require(address(this).balance >= amount, "SafeVault: insufficient balance");

        payable(owner).transfer(amount);
        emit FundWithdrawn(owner, amount, block.timestamp);
    }

    function setSafetyThreshold(uint256 _threshold) external onlyOwner {
        uint256 oldThreshold = safetyThreshold;
        safetyThreshold = _threshold;
        emit SafetyThresholdUpdated(oldThreshold, _threshold, block.timestamp);
    }

    /**
     * @dev Matches the signature in your library script exactly.
     * @param emitter The address that emitted the event.
     * @param eventTopics The topics (tags) of the event.
     * @param data The actual price data.
     */
    function withdraw(uint256 amount) external {
        require(msg.sender == owner, "Only owner can withdraw");
        require(amount <= address(this).balance, "Insufficient vault balance");

        (bool success,) = payable(msg.sender).call{value: amount}("");
        require(success, "Withdrawal transfer failed");
    }

    function setSafetyThreshold(uint256 newThreshold) external {
        require(msg.sender == owner, "Only owner can set threshold");
        safetyThreshold = newThreshold;
    }

    function _onEvent(
        address emitter,
        bytes32[] calldata eventTopics,
        bytes calldata data
    ) internal override {
        // Decode the price from the data (assuming it's a uint256)
        uint256 currentPrice = abi.decode(data, (uint256));

        if (currentPrice <= safetyThreshold) {
            emit ProtectionTriggered(currentPrice, emitter, block.timestamp);
            // Add your "SafeVault" logic here (e.g., pause a contract)
        }
    }
}