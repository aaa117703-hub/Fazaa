import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

type S = { err: Error | null };
export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, S> {
  state: S = { err: null };
  static getDerivedStateFromError(err: Error): S { return { err }; }
  render() {
    if (!this.state.err) return this.props.children;
    return (
      <View style={{ flex: 1, backgroundColor: '#101214', padding: 24, justifyContent: 'center' }}>
        <Text style={{ color: '#FF6B2C', fontSize: 22, fontWeight: '800', textAlign: 'right' }}>صار خطأ بالتطبيق</Text>
        <ScrollView style={{ maxHeight: 260, marginVertical: 14 }}>
          <Text selectable style={{ color: '#C9CED6', textAlign: 'left' }}>{String(this.state.err?.message ?? this.state.err)}</Text>
        </ScrollView>
        <Pressable onPress={() => this.setState({ err: null })} style={{ backgroundColor: '#FF6B2C', padding: 14, borderRadius: 14, alignItems: 'center' }}>
          <Text style={{ color: '#fff', fontWeight: '800', fontSize: 16 }}>إعادة المحاولة</Text>
        </Pressable>
      </View>
    );
  }
}
