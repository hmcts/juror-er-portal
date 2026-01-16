data "azurerm_key_vault" "juror" {
  name                = local.vaultName
  resource_group_name = local.resourceName
}

data "azurerm_subnet" "private_endpoints" {
  resource_group_name  = local.private_endpoint_rg_name
  virtual_network_name = local.private_endpoint_vnet_name
  name                 = "private-endpoints"
}
