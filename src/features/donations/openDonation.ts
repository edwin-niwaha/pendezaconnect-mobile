import * as WebBrowser from "expo-web-browser";
import { backendUrl } from "@/utils/backendRoutes";

export type DonationCurrency = "UGX" | "USD";

export async function openDonation(currency: DonationCurrency) {
  if (currency === "USD") {
    await WebBrowser.openBrowserAsync("https://app.betterunite.com/usapendeza-childsponsorship");
    return {
      opened: true,
      message: "Opening the secure USD donation page."
    };
  }

  await WebBrowser.openBrowserAsync(backendUrl("/sponsorship/initiate/?currency=UGX"));
  return {
    opened: true,
    message: "Opening the secure UGX donation flow."
  };
}
