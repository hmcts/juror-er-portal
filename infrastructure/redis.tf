locals {
  resourceName = "${var.product}-${var.env}-rg"
  vaultName    = "${var.product}-${var.env}"
  cacheName    = "${var.product}-${var.component}-redis-cache"
}

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

data "azurerm_key_vault" "juror" {
  name                = local.vaultName
  resource_group_name = local.resourceName
}

resource "azurerm_key_vault_secret" "redis_connection_string" {
  name         = "${var.component}-redisConnection"
  value        = "rediss://:${urlencode(module.juror-er-redis.access_key)}@${module.juror-er-redis.host_name}:${module.juror-er-redis.redis_port}"
  key_vault_id = data.azurerm_key_vault.juror.id
}

data "azurerm_redis_cache" "juror" {
  name                = "${local.cacheName}-${var.env}"
  resource_group_name = "${local.cacheName}-cache-${var.env}"
}

resource "azurerm_monitor_diagnostic_setting" "cache-ds" {
  name                       = "${local.cacheName}-${var.env}"
  target_resource_id         = data.azurerm_redis_cache.juror.id
  log_analytics_workspace_id = module.log_analytics_workspace.workspace_id

  enabled_log {
    category = "ConnectedClientList"
  }

  enabled_log {
    category = "MSEntraAuthenticationAuditLog"
  }

  lifecycle {
    ignore_changes = [
      metric,
    ]
  }
}

module "log_analytics_workspace" {
  source      = "git@github.com:hmcts/terraform-module-log-analytics-workspace-id.git?ref=master"
  environment = var.env
}
