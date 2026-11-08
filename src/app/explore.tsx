import { Redirect } from "expo-router";

// Keep old links valid without bundling the unrelated Expo tutorial and its assets.
export default function ExploreRedirect() {
  return <Redirect href="/" />;
}
