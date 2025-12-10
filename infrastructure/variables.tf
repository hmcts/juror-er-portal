#Variables with values passed in by Jenkins
variable "env" {
  description = "The deployment environment (sandbox, aat, prod etc..)"
}

variable "product" {
  description = "The name of the application"
}

variable "component" {
  description = "The name of the microservice"
}

variable "subscription" {
  description = "The subscription ID"
}

variable "aks_subscription_id" {
  description = "The aks subscription ID"
}

variable "tenant_id" {
  description = "The Azure AD tenant ID for authenticating to key vault"
}

variable "jenkins_AAD_objectId" {
  description = "The object ID of the user to be granted access to the key vault"
}

variable "common_tags" {
  type = map(string)
}

variable "location" {
  default = "UK South"
}

variable "family" {
  default     = "C"
  description = "The SKU family/pricing group to use. Valid values are `C` (for Basic/Standard SKU family) and `P` (for Premium). Use P for higher availability, but beware it costs a lot more."
}

variable "sku_name" {
  default     = "Basic"
  description = "The SKU of Redis to use. Possible values are `Basic`, `Standard` and `Premium`."
}

variable "capacity" {
  default     = "1"
  description = "The size of the Redis cache to deploy. Valid values are 1, 2, 3, 4, 5"
}
