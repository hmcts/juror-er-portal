module "storage" {
  source                     = "git@github.com:hmcts/cnp-module-storage-account?ref=4.x"
  env                        = var.env
  storage_account_name       = local.storageName
  resource_group_name        = local.resourceName
  location                   = var.location
  account_kind               = "StorageV2"
  account_replication_type   = "ZRS"
  common_tags                = var.common_tags
  private_endpoint_subnet_id = data.azurerm_subnet.private_endpoints.id
  containers = [{
    name        = var.component
    access_type = "private"
  }]
}

resource "azurerm_key_vault_secret" "storage_endpoint" {
  name         = "${var.component}-storage-endpoint"
  value        = module.storage.storageaccount_primary_blob_endpoint
  key_vault_id = data.azurerm_key_vault.juror.id
}

resource "azurerm_key_vault_secret" "storage_connection_string" {
  name         = "${var.component}-storage-connection-string"
  value        = module.storage.storageaccount_primary_connection_string
  key_vault_id = data.azurerm_key_vault.juror.id
}

resource "azurerm_key_vault_secret" "storage_key" {
  name         = "${var.component}-storage-key"
  value        = module.storage.storageaccount_primary_access_key
  key_vault_id = data.azurerm_key_vault.juror.id
}
