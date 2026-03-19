// src/components/LoginAnnouncements.tsx
import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';

interface Announcement {
    id: string;
    title: string;
    message: string;
    date: string;
}

interface Props {
    title: string;
    announcements?: Announcement[];
}

const LoginAnnouncements: React.FC<Props> = ({ title, announcements = [] }) => {
    return (
        <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.container}
        >
            <Text style={styles.title}>{title}</Text>
            {announcements.length > 0 ? (
                announcements.map((item) => (
                    <View key={item.id} style={styles.announcementItem}>
                        <Text style={styles.announcementText}>{item.title}</Text>
                    </View>
                ))
            ) : (
                <View style={styles.announcementItem}>
                    <Text style={styles.announcementText}>No announcements</Text>
                </View>
            )}
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: 16,
        alignItems: 'center',
    },
    title: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: 'bold',
        marginRight: 16,
    },
    announcementItem: {
        marginRight: 24,
    },
    announcementText: {
        color: '#FFFFFF',
        fontSize: 14,
    },
});

export default LoginAnnouncements;