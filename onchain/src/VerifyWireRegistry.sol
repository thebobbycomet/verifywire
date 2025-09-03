// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract VerifyWireRegistry {
    struct Record {
        address owner;
        uint64 updatedAt;
        uint32 version;
        bytes32 wireRouting;
        bytes32 wireAccount;
        bytes32 achRouting;
        bytes32 achAccount;
        bytes32 iban;
        bytes32 bic;
    }

    mapping(string => Record) private records;
    mapping(address => string[]) private ownedEntities;

    event Published(
        string indexed shortCode,
        address indexed owner,
        uint32 version,
        uint64 timestamp,
        bytes32 wireRouting,
        bytes32 wireAccount,
        bytes32 achRouting,
        bytes32 achAccount,
        bytes32 iban,
        bytes32 bic
    );

    function publish(
        string memory lowercaseShortCode,
        bytes32 wireRouting,
        bytes32 wireAccount,
        bytes32 achRouting,
        bytes32 achAccount,
        bytes32 iban,
        bytes32 bic
    ) external {
        Record storage record = records[lowercaseShortCode];

        // First publish sets owner
        if (record.owner == address(0)) {
            record.owner = msg.sender;
            record.version = 1;
            // Add to owner's entity list
            ownedEntities[msg.sender].push(lowercaseShortCode);
        } else {
            // Subsequent publishes must be from owner
            require(record.owner == msg.sender, "Only owner can update");
            record.version += 1;
        }

        record.updatedAt = uint64(block.timestamp);
        record.wireRouting = wireRouting;
        record.wireAccount = wireAccount;
        record.achRouting = achRouting;
        record.achAccount = achAccount;
        record.iban = iban;
        record.bic = bic;

        emit Published(
            lowercaseShortCode,
            record.owner,
            record.version,
            record.updatedAt,
            wireRouting,
            wireAccount,
            achRouting,
            achAccount,
            iban,
            bic
        );
    }

    function getRecord(string memory lowercaseShortCode)
        external
        view
        returns (
            address owner,
            uint64 updatedAt,
            uint32 version,
            bytes32 wireRouting,
            bytes32 wireAccount,
            bytes32 achRouting,
            bytes32 achAccount,
            bytes32 iban,
            bytes32 bic
        )
    {
        Record memory record = records[lowercaseShortCode];
        return (
            record.owner,
            record.updatedAt,
            record.version,
            record.wireRouting,
            record.wireAccount,
            record.achRouting,
            record.achAccount,
            record.iban,
            record.bic
        );
    }

    function getEntitiesByOwner(address owner) external view returns (string[] memory) {
        return ownedEntities[owner];
    }
}
