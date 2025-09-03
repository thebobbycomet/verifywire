// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {VerifyWireRegistry} from "../src/VerifyWireRegistry.sol";

contract DeployScript is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        // Deploy the contract
        VerifyWireRegistry registry = new VerifyWireRegistry();

        vm.stopBroadcast();

        // Print the deployed address
        console.log("VerifyWireRegistry deployed to:", address(registry));

        // Verify the deployment
        require(address(registry) != address(0), "Deployment failed - zero address");
        console.log("Deployment verification: SUCCESS");
    }
}
