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
