locals {
  resourceName = "${var.product}-${var.env}-rg"
  vaultName    = "${var.product}-${var.env}"
  cacheName    = "${var.product}-${var.component}-redis-cache"
  storageName  = "${var.product}sa${var.env}"

  private_endpoint_rg_name   = "ss-${var.env}-network-rg"
  private_endpoint_vnet_name = "ss-${var.env}-vnet"
}
