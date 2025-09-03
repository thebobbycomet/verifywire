// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {VerifyWireRegistry} from "../src/VerifyWireRegistry.sol";

contract VerifyWireRegistryTest is Test {
    VerifyWireRegistry registry;

    address owner1 = address(1);
    address owner2 = address(2);

    bytes32 hash1 = keccak256("test1");
    bytes32 hash2 = keccak256("test2");
    bytes32 hash3 = keccak256("test3");
    bytes32 hash4 = keccak256("test4");
    bytes32 hash5 = keccak256("test5");
    bytes32 hash6 = keccak256("test6");

    function setUp() public {
        registry = new VerifyWireRegistry();
    }

    function testFirstPublishSetsOwner() public {
        vm.prank(owner1);

        registry.publish("testbank", hash1, hash2, hash3, hash4, hash5, hash6);

        (address recordOwner,,,,,,,,) = registry.getRecord("testbank");
        assertEq(recordOwner, owner1);
    }

    function testOwnerCanUpdate() public {
        vm.startPrank(owner1);

        registry.publish("testbank", hash1, hash2, hash3, hash4, hash5, hash6);

        // Update with different hashes
        bytes32 newHash1 = keccak256("newtest1");
        registry.publish("testbank", newHash1, hash2, hash3, hash4, hash5, hash6);

        vm.stopPrank();

        (address recordOwner,, uint32 version,,,,,,) = registry.getRecord("testbank");
        assertEq(recordOwner, owner1);
        assertEq(version, 2);
    }

    function testNonOwnerCannotUpdate() public {
        vm.prank(owner1);
        registry.publish("testbank", hash1, hash2, hash3, hash4, hash5, hash6);

        vm.prank(owner2);
        vm.expectRevert("Only owner can update");
        registry.publish("testbank", hash1, hash2, hash3, hash4, hash5, hash6);
    }

    function testGetRecordReturnsCorrectData() public {
        vm.prank(owner1);
        registry.publish("testbank", hash1, hash2, hash3, hash4, hash5, hash6);

        (
            address recordOwner,
            uint64 updatedAt,
            uint32 version,
            bytes32 wireRouting,
            bytes32 wireAccount,
            bytes32 achRouting,
            bytes32 achAccount,
            bytes32 iban,
            bytes32 bic
        ) = registry.getRecord("testbank");

        assertEq(recordOwner, owner1);
        assertEq(version, 1);
        assertEq(wireRouting, hash1);
        assertEq(wireAccount, hash2);
        assertEq(achRouting, hash3);
        assertEq(achAccount, hash4);
        assertEq(iban, hash5);
        assertEq(bic, hash6);
        assertGt(updatedAt, 0);
    }

    function testNonExistentRecordReturnsEmpty() public {
        (
            address recordOwner,
            uint64 updatedAt,
            uint32 version,
            bytes32 wireRouting,
            bytes32 wireAccount,
            bytes32 achRouting,
            bytes32 achAccount,
            bytes32 iban,
            bytes32 bic
        ) = registry.getRecord("nonexistent");

        assertEq(recordOwner, address(0));
        assertEq(updatedAt, 0);
        assertEq(version, 0);
        assertEq(wireRouting, bytes32(0));
        assertEq(wireAccount, bytes32(0));
        assertEq(achRouting, bytes32(0));
        assertEq(achAccount, bytes32(0));
        assertEq(iban, bytes32(0));
        assertEq(bic, bytes32(0));
    }
}
