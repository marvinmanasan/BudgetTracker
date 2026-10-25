import { useState } from "react";
import { Button, StyleSheet, Text, View } from "react-native";

export default function Index() {
  const [count, setCount] = useState(0);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Count: {count}</Text>
      <Button title="Add 1" onPress={() => setCount(count + 1)} />
      <Button
        title="Subtract 1"
        onPress={() => {
          if (count < 0) setCount(0);
          if (count > 0) setCount(count - 1);
        }}
      />
      <Button title="Reset" onPress={() => setCount(0)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  title: { fontSize: 32, color: "white" },
});
