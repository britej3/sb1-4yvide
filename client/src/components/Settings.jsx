import React, { useState } from 'react';
import {
  Box,
  Heading,
  VStack,
  FormControl,
  FormLabel,
  Input,
  Button,
  useToast,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  Switch,
  Select,
  Divider,
  Text,
  Textarea,
} from '@chakra-ui/react';

function Settings() {
  const [settings, setSettings] = useState({
    rpcUrl: '',
    walletAddress: '',
    privateKey: '',
    minProfit: 0.5,
    maxTradeAmount: 1000,
    autoRestart: false,
    flashLoanProvider: 'aave',
    minCapital: 100,
    maxLeverage: 3,
    slippageTolerance: 0.5,
    gasLimit: 500000,
    networks: [
      { chainId: 1, name: 'Ethereum' },
      { chainId: 56, name: 'BSC' },
      { chainId: 137, name: 'Polygon' },
      { chainId: 42161, name: 'Arbitrum' }
    ],
    selectedNetwork: 1,
    tradingPairs: ['WETH/USDT', 'WBTC/USDT', 'USDC/USDT'],
    customRpcEndpoints: '',
    parallelExecutions: 3,
    maxRetries: 3,
    priceImpactThreshold: 1
  });

  const toast = useToast();

  const handleChange = (field, value) => {
    setSettings(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const validateSettings = () => {
    if (!settings.rpcUrl) {
      throw new Error('RPC URL is required');
    }
    if (settings.minCapital < 100) {
      throw new Error('Minimum capital requirement is 100 USDT');
    }
    if (!settings.walletAddress || !settings.privateKey) {
      throw new Error('Wallet address and private key are required');
    }
    if (settings.priceImpactThreshold < 0.1 || settings.priceImpactThreshold > 5) {
      throw new Error('Price impact threshold must be between 0.1% and 5%');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      validateSettings();

      // Here we would typically send settings to the backend
      const response = await fetch('http://localhost:5000/api/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      });

      if (!response.ok) {
        throw new Error('Failed to save settings');
      }

      toast({
        title: 'Settings saved successfully',
        description: 'Bot configuration has been updated',
        status: 'success',
        duration: 3000,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: error.message,
        status: 'error',
        duration: 5000,
      });
    }
  };

  return (
    <Box p={5} shadow="md" borderWidth="1px" borderRadius="lg" w="100%">
      <Heading size="md" mb={4}>Bot Settings</Heading>
      <form onSubmit={handleSubmit}>
        <VStack spacing={4} align="stretch">
          <FormControl isRequired>
            <FormLabel>RPC URL</FormLabel>
            <Input
              type="text"
              value={settings.rpcUrl}
              onChange={(e) => handleChange('rpcUrl', e.target.value)}
              placeholder="Enter your RPC URL"
            />
          </FormControl>

          <FormControl>
            <FormLabel>Backup RPC Endpoints (one per line)</FormLabel>
            <Textarea
              value={settings.customRpcEndpoints}
              onChange={(e) => handleChange('customRpcEndpoints', e.target.value)}
              placeholder="Enter additional RPC endpoints"
              size="sm"
            />
          </FormControl>

          <FormControl>
            <FormLabel>Network</FormLabel>
            <Select
              value={settings.selectedNetwork}
              onChange={(e) => handleChange('selectedNetwork', parseInt(e.target.value))}
            >
              {settings.networks.map(network => (
                <option key={network.chainId} value={network.chainId}>
                  {network.name}
                </option>
              ))}
            </Select>
          </FormControl>

          <Divider />

          <FormControl isRequired>
            <FormLabel>Wallet Address</FormLabel>
            <Input
              type="text"
              value={settings.walletAddress}
              onChange={(e) => handleChange('walletAddress', e.target.value)}
              placeholder="Enter your wallet address"
            />
          </FormControl>

          <FormControl isRequired>
            <FormLabel>Private Key</FormLabel>
            <Input
              type="password"
              value={settings.privateKey}
              onChange={(e) => handleChange('privateKey', e.target.value)}
              placeholder="Enter your private key"
            />
          </FormControl>

          <Divider />
          <Text fontSize="lg" fontWeight="bold">Flash Loan Settings</Text>

          <FormControl>
            <FormLabel>Flash Loan Provider</FormLabel>
            <Select
              value={settings.flashLoanProvider}
              onChange={(e) => handleChange('flashLoanProvider', e.target.value)}
            >
              <option value="aave">Aave</option>
              <option value="dydx">dYdX</option>
              <option value="balancer">Balancer</option>
            </Select>
          </FormControl>

          <FormControl isRequired>
            <FormLabel>Minimum Capital (USDT)</FormLabel>
            <NumberInput
              min={100}
              max={1000000}
              value={settings.minCapital}
              onChange={(value) => handleChange('minCapital', parseFloat(value))}
            >
              <NumberInputField />
              <NumberInputStepper>
                <NumberIncrementStepper />
                <NumberDecrementStepper />
              </NumberInputStepper>
            </NumberInput>
          </FormControl>

          <Divider />
          <Text fontSize="lg" fontWeight="bold">Performance Settings</Text>

          <FormControl>
            <FormLabel>Parallel Executions</FormLabel>
            <NumberInput
              min={1}
              max={5}
              value={settings.parallelExecutions}
              onChange={(value) => handleChange('parallelExecutions', parseInt(value))}
            >
              <NumberInputField />
              <NumberInputStepper>
                <NumberIncrementStepper />
                <NumberDecrementStepper />
              </NumberInputStepper>
            </NumberInput>
          </FormControl>

          <FormControl>
            <FormLabel>Price Impact Threshold (%)</FormLabel>
            <NumberInput
              min={0.1}
              max={5}
              step={0.1}
              value={settings.priceImpactThreshold}
              onChange={(value) => handleChange('priceImpactThreshold', parseFloat(value))}
            >
              <NumberInputField />
              <NumberInputStepper>
                <NumberIncrementStepper />
                <NumberDecrementStepper />
              </NumberInputStepper>
            </NumberInput>
          </FormControl>

          <FormControl>
            <FormLabel>Maximum Retries</FormLabel>
            <NumberInput
              min={1}
              max={10}
              value={settings.maxRetries}
              onChange={(value) => handleChange('maxRetries', parseInt(value))}
            >
              <NumberInputField />
              <NumberInputStepper>
                <NumberIncrementStepper />
                <NumberDecrementStepper />
              </NumberInputStepper>
            </NumberInput>
          </FormControl>

          <FormControl>
            <FormLabel>Gas Limit (GWEI)</FormLabel>
            <NumberInput
              min={100000}
              max={1000000}
              step={50000}
              value={settings.gasLimit}
              onChange={(value) => handleChange('gasLimit', parseFloat(value))}
            >
              <NumberInputField />
              <NumberInputStepper>
                <NumberIncrementStepper />
                <NumberDecrementStepper />
              </NumberInputStepper>
            </NumberInput>
          </FormControl>

          <FormControl display="flex" alignItems="center">
            <FormLabel mb="0">Auto-restart on error</FormLabel>
            <Switch
              isChecked={settings.autoRestart}
              onChange={(e) => handleChange('autoRestart', e.target.checked)}
            />
          </FormControl>

          <Button type="submit" colorScheme="blue" size="lg">
            Save Settings
          </Button>
        </VStack>
      </form>
    </Box>
  );
}

export default Settings;