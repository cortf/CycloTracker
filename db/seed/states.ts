/**
 * Seed data for the `states` dimension: 50 states + DC + 5 territories, with
 * 2-digit FIPS codes. `mappable` = drawn on the Albers USA map (50 states + DC).
 * Territories are stored because NNDSS reports them, but are not mapped.
 */
export interface SeedState {
  fips: string;
  name: string;
  usps: string;
  type: "state" | "district" | "territory";
  mappable: boolean;
}

export const SEED_STATES: SeedState[] = [
  { fips: "01", name: "Alabama", usps: "AL", type: "state", mappable: true },
  { fips: "02", name: "Alaska", usps: "AK", type: "state", mappable: true },
  { fips: "04", name: "Arizona", usps: "AZ", type: "state", mappable: true },
  { fips: "05", name: "Arkansas", usps: "AR", type: "state", mappable: true },
  { fips: "06", name: "California", usps: "CA", type: "state", mappable: true },
  { fips: "08", name: "Colorado", usps: "CO", type: "state", mappable: true },
  { fips: "09", name: "Connecticut", usps: "CT", type: "state", mappable: true },
  { fips: "10", name: "Delaware", usps: "DE", type: "state", mappable: true },
  { fips: "11", name: "District of Columbia", usps: "DC", type: "district", mappable: true },
  { fips: "12", name: "Florida", usps: "FL", type: "state", mappable: true },
  { fips: "13", name: "Georgia", usps: "GA", type: "state", mappable: true },
  { fips: "15", name: "Hawaii", usps: "HI", type: "state", mappable: true },
  { fips: "16", name: "Idaho", usps: "ID", type: "state", mappable: true },
  { fips: "17", name: "Illinois", usps: "IL", type: "state", mappable: true },
  { fips: "18", name: "Indiana", usps: "IN", type: "state", mappable: true },
  { fips: "19", name: "Iowa", usps: "IA", type: "state", mappable: true },
  { fips: "20", name: "Kansas", usps: "KS", type: "state", mappable: true },
  { fips: "21", name: "Kentucky", usps: "KY", type: "state", mappable: true },
  { fips: "22", name: "Louisiana", usps: "LA", type: "state", mappable: true },
  { fips: "23", name: "Maine", usps: "ME", type: "state", mappable: true },
  { fips: "24", name: "Maryland", usps: "MD", type: "state", mappable: true },
  { fips: "25", name: "Massachusetts", usps: "MA", type: "state", mappable: true },
  { fips: "26", name: "Michigan", usps: "MI", type: "state", mappable: true },
  { fips: "27", name: "Minnesota", usps: "MN", type: "state", mappable: true },
  { fips: "28", name: "Mississippi", usps: "MS", type: "state", mappable: true },
  { fips: "29", name: "Missouri", usps: "MO", type: "state", mappable: true },
  { fips: "30", name: "Montana", usps: "MT", type: "state", mappable: true },
  { fips: "31", name: "Nebraska", usps: "NE", type: "state", mappable: true },
  { fips: "32", name: "Nevada", usps: "NV", type: "state", mappable: true },
  { fips: "33", name: "New Hampshire", usps: "NH", type: "state", mappable: true },
  { fips: "34", name: "New Jersey", usps: "NJ", type: "state", mappable: true },
  { fips: "35", name: "New Mexico", usps: "NM", type: "state", mappable: true },
  { fips: "36", name: "New York", usps: "NY", type: "state", mappable: true },
  { fips: "37", name: "North Carolina", usps: "NC", type: "state", mappable: true },
  { fips: "38", name: "North Dakota", usps: "ND", type: "state", mappable: true },
  { fips: "39", name: "Ohio", usps: "OH", type: "state", mappable: true },
  { fips: "40", name: "Oklahoma", usps: "OK", type: "state", mappable: true },
  { fips: "41", name: "Oregon", usps: "OR", type: "state", mappable: true },
  { fips: "42", name: "Pennsylvania", usps: "PA", type: "state", mappable: true },
  { fips: "44", name: "Rhode Island", usps: "RI", type: "state", mappable: true },
  { fips: "45", name: "South Carolina", usps: "SC", type: "state", mappable: true },
  { fips: "46", name: "South Dakota", usps: "SD", type: "state", mappable: true },
  { fips: "47", name: "Tennessee", usps: "TN", type: "state", mappable: true },
  { fips: "48", name: "Texas", usps: "TX", type: "state", mappable: true },
  { fips: "49", name: "Utah", usps: "UT", type: "state", mappable: true },
  { fips: "50", name: "Vermont", usps: "VT", type: "state", mappable: true },
  { fips: "51", name: "Virginia", usps: "VA", type: "state", mappable: true },
  { fips: "53", name: "Washington", usps: "WA", type: "state", mappable: true },
  { fips: "54", name: "West Virginia", usps: "WV", type: "state", mappable: true },
  { fips: "55", name: "Wisconsin", usps: "WI", type: "state", mappable: true },
  { fips: "56", name: "Wyoming", usps: "WY", type: "state", mappable: true },
  // Territories — reported by NNDSS, stored but not drawn on the Albers USA map.
  { fips: "60", name: "American Samoa", usps: "AS", type: "territory", mappable: false },
  { fips: "66", name: "Guam", usps: "GU", type: "territory", mappable: false },
  { fips: "69", name: "Northern Mariana Islands", usps: "MP", type: "territory", mappable: false },
  { fips: "72", name: "Puerto Rico", usps: "PR", type: "territory", mappable: false },
  { fips: "78", name: "U.S. Virgin Islands", usps: "VI", type: "territory", mappable: false },
];
