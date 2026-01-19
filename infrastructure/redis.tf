
module "juror-er-redis" {
  source                        = "git@github.com:hmcts/cnp-module-redis?ref=master"
  product                       = local.cacheName
  location                      = var.location
  env                           = var.env
  common_tags                   = var.common_tags
  private_endpoint_enabled      = true
  redis_version                 = "6"
  business_area                 = "sds"
  public_network_access_enabled = false
  sku_name                      = var.sku_name
  family                        = var.family
  capacity                      = var.capacity
}

resource "azurerm_key_vault_secret" "redis_connection_string" {
  name         = "${var.component}-redisConnection"
  value        = "rediss://:${urlencode(module.juror-er-redis.access_key)}@${module.juror-er-redis.host_name}:${module.juror-er-redis.redis_port}"
  key_vault_id = data.azurerm_key_vault.juror.id
}

