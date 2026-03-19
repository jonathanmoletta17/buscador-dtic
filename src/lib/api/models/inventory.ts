import type { IsoDateTimeString } from "@/lib/datetime/iso";

export type InventoryItemType =
  | "Computer"
  | "Monitor"
  | "Printer"
  | "NetworkEquipment"
  | "Peripheral"
  | "Phone";

export interface InventoryLinks {
  glpi: string;
}

export interface InventoryBucket {
  key: string;
  label: string;
  total: number;
}

export interface InventoryAsset {
  itemtype: InventoryItemType;
  id: number;
  name: string;
  serial: string | null;
  assetTag: string | null;
  stateId: number | null;
  stateName: string | null;
  locationId: number | null;
  locationName: string | null;
  responsibleUserId: number | null;
  responsibleUserName: string | null;
  responsibleGroupId: number | null;
  responsibleGroupName: string | null;
  techUserId: number | null;
  techUserName: string | null;
  techGroupId: number | null;
  techGroupName: string | null;
  manufacturerId: number | null;
  manufacturerName: string | null;
  modelId: number | null;
  modelName: string | null;
  isDynamic: boolean;
  dateMod: IsoDateTimeString | null;
  lastInventoryUpdate: IsoDateTimeString | null;
  inventoryStale: boolean;
  links: InventoryLinks;
}

export interface InventorySummary {
  context: string;
  totalAssets: number;
  totalsByItemtype: InventoryBucket[];
  totalsByState: InventoryBucket[];
  missingOwner: number;
  missingLocation: number;
  missingTechGroup: number;
  staleInventory: number;
}

export interface InventoryAssetListResult {
  context: string;
  total: number;
  limit: number;
  offset: number;
  sort: string;
  order: string;
  data: InventoryAsset[];
}

export interface InventoryLogEntry {
  id: number;
  action: string;
  userName: string | null;
  dateMod: IsoDateTimeString | null;
  oldValue: string | null;
  newValue: string | null;
}

export interface InventoryDiskEntry {
  id: number;
  name: string | null;
  device: string | null;
  mountpoint: string | null;
  totalSize: number | null;
  freeSize: number | null;
  isDynamic: boolean;
  dateMod: IsoDateTimeString | null;
}

export interface InventoryNetworkPortEntry {
  id: number;
  name: string | null;
  mac: string | null;
  ifdescr: string | null;
  ifalias: string | null;
  ifspeed: string | null;
  ifstatus: string | null;
  ifconnectionstatus: string | null;
  lastup: IsoDateTimeString | null;
  dateMod: IsoDateTimeString | null;
}

export interface InventorySoftwareInstallationEntry {
  id: number;
  softwareId: number | null;
  softwareName: string | null;
  versionId: number | null;
  versionName: string | null;
  arch: string | null;
  dateInstall: IsoDateTimeString | null;
  isDynamic: boolean;
}

export interface InventoryConnectionEntry {
  itemtype: string;
  id: number;
  name: string | null;
  serial: string | null;
  assetTag: string | null;
}

export interface InventoryAssetDetail {
  context: string;
  asset: InventoryAsset;
  logs: InventoryLogEntry[];
  disks: InventoryDiskEntry[];
  networkPorts: InventoryNetworkPortEntry[];
  softwareInstallations: InventorySoftwareInstallationEntry[];
  connections: InventoryConnectionEntry[];
}

export interface InventoryMutationResult {
  context: string;
  itemtype: InventoryItemType;
  id: number;
  success: boolean;
  message: string;
  result?: unknown;
}

export type InventorySortKey =
  | "name"
  | "date_mod"
  | "last_inventory_update"
  | "state_name"
  | "location_name";

export type InventoryOrder = "asc" | "desc";

export interface InventoryFilters {
  itemtypes: InventoryItemType[];
  statesId: number[];
  locationsId: number[];
  groupsId: number[];
  q: string;
  onlyMissingOwner: boolean;
  onlyMissingLocation: boolean;
  onlyMissingTechGroup: boolean;
  onlyStaleInventory: boolean;
  limit: number;
  offset: number;
  sort: InventorySortKey;
  order: InventoryOrder;
}
