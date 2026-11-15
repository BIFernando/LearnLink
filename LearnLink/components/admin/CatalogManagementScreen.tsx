import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import type { DocumentData, QueryDocumentSnapshot } from "firebase/firestore";

import {
  AdminCatalogReferencesError,
  createAdminCategory,
  createAdminSkill,
  deleteAdminCategory,
  deleteAdminSkill,
  getAdminCategoriesPage,
  getAdminSkillsPage,
  updateAdminCategory,
  updateAdminSkill,
  type AdminCatalogRecord,
} from "../../services/adminCatalog";

type CatalogKind = "skills" | "categories";

interface CatalogManagementScreenProps {
  kind: CatalogKind;
}

interface CatalogForm {
  name: string;
  description: string;
  categoryId: string;
}

const EMPTY_FORM: CatalogForm = {
  name: "",
  description: "",
  categoryId: "",
};

export function CatalogManagementScreen({
  kind,
}: CatalogManagementScreenProps) {
  const router = useRouter();
  const isSkills = kind === "skills";
  const title = isSkills ? "Skill Management" : "Category Management";
  const getPage = isSkills ? getAdminSkillsPage : getAdminCategoriesPage;
  const [records, setRecords] = useState<AdminCatalogRecord[]>([]);
  const [categories, setCategories] = useState<AdminCatalogRecord[]>([]);
  const [categoryCursor, setCategoryCursor] =
    useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [hasMoreCategories, setHasMoreCategories] = useState(false);
  const [cursor, setCursor] =
    useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState<CatalogForm>(EMPTY_FORM);
  const [editing, setEditing] = useState<AdminCatalogRecord | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AdminCatalogRecord | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");
  const [deletingId, setDeletingId] = useState("");
  const requestId = useRef(0);

  const loadFirstPage = useCallback(async (isRefresh = false) => {
    const currentRequestId = ++requestId.current;
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setLoadingMore(false);
    setError("");

    try {
      const [catalogPage, categoryPage] = await Promise.all([
        getPage(null),
        isSkills ? getAdminCategoriesPage(null) : Promise.resolve(null),
      ]);
      if (requestId.current !== currentRequestId) {
        return;
      }

      setRecords(catalogPage.records);
      setCursor(catalogPage.lastDocument);
      setHasMore(catalogPage.hasMore);
      if (categoryPage) {
        setCategories(categoryPage.records);
        setCategoryCursor(categoryPage.lastDocument);
        setHasMoreCategories(categoryPage.hasMore);
      }
    } catch (loadError) {
      console.error(`Failed to load ${kind} catalog:`, loadError);
      if (requestId.current === currentRequestId) {
        setError(
          `Could not load ${kind}. Check your connection and administrator access, then try again.`
        );
      }
    } finally {
      if (requestId.current === currentRequestId) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [getPage, isSkills, kind]);

  useEffect(() => {
    void loadFirstPage();
    return () => {
      requestId.current += 1;
    };
  }, [loadFirstPage]);

  const visibleRecords = useMemo(() => {
    const value = search.trim().toLocaleLowerCase();
    if (!value) {
      return records;
    }

    return records.filter((record) =>
      [record.id, record.name, record.description, record.categoryId].some(
        (field) => field?.toLocaleLowerCase().includes(value)
      )
    );
  }, [records, search]);

  async function loadMoreRecords() {
    if (!hasMore || loadingMore || !cursor) {
      return;
    }

    const currentRequestId = requestId.current;
    setLoadingMore(true);
    setError("");
    try {
      const page = await getPage(cursor);
      if (requestId.current !== currentRequestId) {
        return;
      }

      setRecords((current) => [...current, ...page.records]);
      setCursor(page.lastDocument);
      setHasMore(page.hasMore);
    } catch (loadError) {
      console.error(`Failed to load more ${kind}:`, loadError);
      if (requestId.current === currentRequestId) {
        setError(`Could not load more ${kind}. Please retry.`);
      }
    } finally {
      if (requestId.current === currentRequestId) {
        setLoadingMore(false);
      }
    }
  }

  async function loadMoreCategories() {
    if (!hasMoreCategories || !categoryCursor) {
      return;
    }

    try {
      const page = await getAdminCategoriesPage(categoryCursor);
      setCategories((current) => [...current, ...page.records]);
      setCategoryCursor(page.lastDocument);
      setHasMoreCategories(page.hasMore);
    } catch (loadError) {
      console.error("Failed to load more categories:", loadError);
      setFormError("Could not load more categories. Please try again.");
    }
  }

  function startCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormError("");
    setShowForm(true);
  }

  function startEdit(record: AdminCatalogRecord) {
    if (!record.editable) {
      return;
    }
    setEditing(record);
    setShowForm(true);
    setForm({
      name: record.name,
      description: record.description ?? "",
      categoryId: record.categoryId ?? "",
    });
    setFormError("");
  }

  function closeForm() {
    if (saving) {
      return;
    }
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormError("");
    setShowForm(false);
  }

  async function saveRecord() {
    setFormError("");
    setSaving(true);
    try {
      if (isSkills) {
        if (editing) {
          await updateAdminSkill(editing.id, form);
        } else {
          await createAdminSkill(form);
        }
      } else if (editing) {
        await updateAdminCategory(editing.id, form.name, form.description);
      } else {
        await createAdminCategory(form.name, form.description);
      }

      setEditing(null);
      setForm(EMPTY_FORM);
      setShowForm(false);
      await loadFirstPage(true);
    } catch (saveError) {
      console.error(`Failed to save ${kind} record:`, saveError);
      setFormError(
        saveError instanceof Error
          ? saveError.message
          : `Could not save this ${isSkills ? "skill" : "category"}.`
      );
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) {
      return;
    }

    setDeletingId(deleteTarget.id);
    setError("");
    try {
      if (isSkills) {
        await deleteAdminSkill(deleteTarget.id);
      } else {
        await deleteAdminCategory(deleteTarget.id);
      }

      setDeleteTarget(null);
      await loadFirstPage(true);
    } catch (deleteError) {
      console.error(`Failed to delete ${kind} record:`, deleteError);
      if (deleteError instanceof AdminCatalogReferencesError) {
        setError(
          `Cannot delete "${deleteTarget.name}": it is referenced by ${deleteError.references.join("; ")}.`
        );
      } else {
        setError(
          deleteError instanceof Error
            ? deleteError.message
            : `Could not delete this ${isSkills ? "skill" : "category"}.`
        );
      }
      setDeleteTarget(null);
    } finally {
      setDeletingId("");
    }
  }

  function renderHeader() {
    return (
      <View>
        <Pressable
          accessibilityRole="link"
          onPress={() => router.replace("/admin")}
          style={styles.backLink}
        >
          <Text style={styles.backLinkText}>‹  Admin dashboard</Text>
        </Pressable>
        {isSkills ? (
          <Pressable
            accessibilityRole="link"
            onPress={() => router.push("/admin/categories")}
            style={styles.categoryLink}
          >
            <Text style={styles.categoryLinkText}>Manage categories ›</Text>
          </Pressable>
        ) : (
          <Pressable
            accessibilityRole="link"
            onPress={() => router.push("/admin/skills")}
            style={styles.categoryLink}
          >
            <Text style={styles.categoryLinkText}>Manage skills ›</Text>
          </Pressable>
        )}
        <Text style={styles.eyebrow}>LEARNLINK / ADMIN / CATALOG</Text>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>
          {isSkills
            ? "Manage the shared skills catalog. User-specific skills remain in userSkills."
            : "Manage catalog categories. Existing free-form user skill categories are not changed."}
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={startCreate}
          style={styles.primaryButton}
        >
          <Text style={styles.primaryButtonText}>
            Add {isSkills ? "skill" : "category"}
          </Text>
        </Pressable>
        <TextInput
          accessibilityLabel={`Search ${kind}`}
          autoCapitalize="none"
          autoCorrect={false}
          onChangeText={setSearch}
          placeholder={`Search loaded ${kind} by name or ID`}
          placeholderTextColor="#8793A5"
          style={styles.searchInput}
          value={search}
        />
        <Text style={styles.countText}>
          {search.trim()
            ? `${visibleRecords.length} matching loaded record${visibleRecords.length === 1 ? "" : "s"}`
            : `${records.length}${hasMore ? "+" : ""} record${records.length === 1 ? "" : "s"} loaded`}
        </Text>
        {error ? (
          <View style={styles.errorBanner}>
            <Text accessibilityRole="alert" style={styles.errorText}>
              {error}
            </Text>
            <Pressable onPress={() => void loadFirstPage(true)}>
              <Text style={styles.retryText}>Retry</Text>
            </Pressable>
          </View>
        ) : null}
      </View>
    );
  }

  function renderItem({ item }: { item: AdminCatalogRecord }) {
    const categoryName = categories.find(
      (category) => category.id === item.categoryId
    )?.name;

    return (
      <View style={styles.recordCard}>
        <View style={styles.recordCopy}>
          <Text style={styles.recordName}>{item.name}</Text>
          <Text style={styles.recordDescription}>
            {item.description || "No description"}
          </Text>
          {isSkills ? (
            <Text style={styles.recordMeta}>
              Category: {categoryName ?? item.categoryId ?? "None"}
            </Text>
          ) : null}
          <Text style={styles.recordMeta}>Document ID: {item.id}</Text>
          {!item.editable ? (
            <Text style={styles.legacyWarning}>
              Unrecognized legacy document — read-only
            </Text>
          ) : null}
        </View>
        <View style={styles.recordActions}>
          <Pressable
            accessibilityRole="button"
            disabled={!item.editable}
            onPress={() => startEdit(item)}
            style={[styles.smallButton, !item.editable && styles.disabledButton]}
          >
            <Text style={styles.smallButtonText}>Edit</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            disabled={!item.editable || deletingId === item.id}
            onPress={() => setDeleteTarget(item)}
            style={[
              styles.smallButton,
              styles.deleteButton,
              !item.editable && styles.disabledButton,
            ]}
          >
            <Text style={styles.deleteButtonText}>
              {deletingId === item.id ? "Deleting…" : "Delete"}
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }

  function renderFooter() {
    if (loadingMore) {
      return (
        <View style={styles.footer}>
          <ActivityIndicator color="#3159A5" />
        </View>
      );
    }

    if (!hasMore) {
      return records.length ? (
        <Text style={styles.endText}>You’ve reached the end of the catalog.</Text>
      ) : null;
    }

    return (
      <Pressable onPress={() => void loadMoreRecords()} style={styles.loadMore}>
        <Text style={styles.loadMoreText}>Load more</Text>
      </Pressable>
    );
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color="#3159A5" size="large" />
        <Text style={styles.centeredText}>Loading {kind}...</Text>
      </View>
    );
  }

  if (error && records.length === 0) {
    return (
      <View style={styles.centered}>
        <View style={styles.errorCard}>
          <Text style={styles.title}>{title} unavailable</Text>
          <Text accessibilityRole="alert" style={styles.errorText}>
            {error}
          </Text>
          <Pressable
            onPress={() => void loadFirstPage()}
            style={styles.primaryButton}
          >
            <Text style={styles.primaryButtonText}>Retry</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <>
      <FlatList
        contentContainerStyle={styles.listContent}
        data={visibleRecords}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          <View style={styles.emptyCard}>
            <Text style={styles.recordName}>
              {records.length === 0
                ? `No ${kind} found`
                : `No matching ${kind}`}
            </Text>
            <Text style={styles.recordDescription}>
              {records.length === 0
                ? `The ${kind} collection has no documents. Add one to start the approved catalog.`
                : "Try another search. Search currently covers only loaded records."}
            </Text>
          </View>
        }
        ListFooterComponent={renderFooter}
        ListHeaderComponent={renderHeader}
        refreshControl={
          <RefreshControl
            onRefresh={() => void loadFirstPage(true)}
            refreshing={refreshing}
            tintColor="#3159A5"
          />
        }
        renderItem={renderItem}
        style={styles.list}
      />

      <Modal
        animationType="fade"
        onRequestClose={closeForm}
        transparent
        visible={showForm}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.modalBackdrop}
        >
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>
              {editing
                ? `Edit ${isSkills ? "skill" : "category"}`
                : `Add ${isSkills ? "skill" : "category"}`}
            </Text>
            <Text style={styles.fieldLabel}>Name</Text>
            <TextInput
              editable={!saving}
              maxLength={100}
              onChangeText={(name) => setForm((current) => ({ ...current, name }))}
              placeholder={isSkills ? "Skill name" : "Category name"}
              style={styles.formInput}
              value={form.name}
            />
            <Text style={styles.fieldLabel}>Description (optional)</Text>
            <TextInput
              editable={!saving}
              maxLength={1000}
              multiline
              onChangeText={(description) =>
                setForm((current) => ({ ...current, description }))
              }
              placeholder="Add a short description"
              style={[styles.formInput, styles.descriptionInput]}
              value={form.description}
            />
            {isSkills ? (
              <>
                <Text style={styles.fieldLabel}>Category (optional)</Text>
                <View style={styles.categoryOptions}>
                  <Pressable
                    onPress={() =>
                      setForm((current) => ({ ...current, categoryId: "" }))
                    }
                    style={[
                      styles.categoryOption,
                      !form.categoryId && styles.categoryOptionSelected,
                    ]}
                  >
                    <Text style={styles.categoryOptionText}>None</Text>
                  </Pressable>
                  {categories
                    .filter((category) => category.editable)
                    .map((category) => (
                      <Pressable
                        key={category.id}
                        onPress={() =>
                          setForm((current) => ({
                            ...current,
                            categoryId: category.id,
                          }))
                        }
                        style={[
                          styles.categoryOption,
                          form.categoryId === category.id &&
                            styles.categoryOptionSelected,
                        ]}
                      >
                        <Text style={styles.categoryOptionText}>
                          {category.name}
                        </Text>
                      </Pressable>
                    ))}
                </View>
                {hasMoreCategories ? (
                  <Pressable onPress={() => void loadMoreCategories()}>
                    <Text style={styles.retryText}>Load more categories</Text>
                  </Pressable>
                ) : null}
              </>
            ) : null}
            {formError ? (
              <Text accessibilityRole="alert" style={styles.errorText}>
                {formError}
              </Text>
            ) : null}
            <View style={styles.formActions}>
              <Pressable
                disabled={saving}
                onPress={closeForm}
                style={styles.cancelButton}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                disabled={saving}
                onPress={() => void saveRecord()}
                style={[styles.primaryButton, saving && styles.disabledButton]}
              >
                {saving ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.primaryButtonText}>Save</Text>
                )}
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal
        animationType="fade"
        onRequestClose={() => setDeleteTarget(null)}
        transparent
        visible={deleteTarget !== null}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>Confirm deletion</Text>
            <Text style={styles.confirmText}>
              Delete “{deleteTarget?.name}”? The record will not be deleted if
              users, matches, exchanges, sessions, or catalog records still
              reference it.
            </Text>
            <View style={styles.formActions}>
              <Pressable
                disabled={Boolean(deletingId)}
                onPress={() => setDeleteTarget(null)}
                style={styles.cancelButton}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                disabled={Boolean(deletingId)}
                onPress={() => void confirmDelete()}
                style={[styles.dangerButton, deletingId && styles.disabledButton]}
              >
                {deletingId ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.primaryButtonText}>Delete</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  list: {
    backgroundColor: "#F3F6FB",
    flex: 1,
  },
  listContent: {
    alignSelf: "center",
    maxWidth: 980,
    padding: 20,
    paddingBottom: 40,
    width: "100%",
  },
  centered: {
    alignItems: "center",
    backgroundColor: "#F3F6FB",
    flex: 1,
    justifyContent: "center",
    padding: 24,
  },
  centeredText: {
    color: "#64748B",
    fontSize: 15,
    marginTop: 14,
  },
  backLink: {
    alignSelf: "flex-start",
    marginBottom: 10,
    paddingVertical: 5,
  },
  backLinkText: {
    color: "#3159A5",
    fontSize: 14,
    fontWeight: "600",
  },
  categoryLink: {
    alignSelf: "flex-start",
    marginBottom: 18,
    paddingVertical: 5,
  },
  categoryLinkText: {
    color: "#3159A5",
    fontSize: 13,
    fontWeight: "600",
  },
  eyebrow: {
    color: "#3159A5",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.4,
    marginBottom: 8,
  },
  title: {
    color: "#17243A",
    fontSize: 28,
    fontWeight: "700",
  },
  subtitle: {
    color: "#64748B",
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 16,
    marginTop: 7,
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: "#3159A5",
    borderRadius: 10,
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: 16,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  searchInput: {
    backgroundColor: "#FFFFFF",
    borderColor: "#CBD5E1",
    borderRadius: 10,
    borderWidth: 1,
    color: "#17243A",
    fontSize: 14,
    marginTop: 14,
    minHeight: 46,
    paddingHorizontal: 13,
  },
  countText: {
    color: "#718096",
    fontSize: 12,
    marginBottom: 12,
    marginTop: 8,
  },
  errorBanner: {
    backgroundColor: "#FFF4F2",
    borderRadius: 10,
    marginBottom: 12,
    padding: 12,
  },
  errorText: {
    color: "#B42318",
    fontSize: 13,
    lineHeight: 20,
  },
  retryText: {
    color: "#3159A5",
    fontSize: 13,
    fontWeight: "700",
    marginTop: 8,
  },
  recordCard: {
    alignItems: "flex-start",
    backgroundColor: "#FFFFFF",
    borderColor: "#E2E8F0",
    borderRadius: 13,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
    padding: 15,
  },
  recordCopy: {
    flex: 1,
    paddingRight: 12,
  },
  recordName: {
    color: "#24324A",
    fontSize: 15,
    fontWeight: "700",
  },
  recordDescription: {
    color: "#64748B",
    fontSize: 13,
    lineHeight: 19,
    marginTop: 5,
  },
  recordMeta: {
    color: "#718096",
    fontSize: 11,
    marginTop: 5,
  },
  legacyWarning: {
    color: "#9A5B00",
    fontSize: 12,
    fontWeight: "600",
    marginTop: 8,
  },
  recordActions: {
    gap: 7,
  },
  smallButton: {
    alignItems: "center",
    backgroundColor: "#EEF3FB",
    borderRadius: 8,
    minWidth: 68,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  smallButtonText: {
    color: "#3159A5",
    fontSize: 12,
    fontWeight: "700",
  },
  deleteButton: {
    backgroundColor: "#FFF1EE",
  },
  deleteButtonText: {
    color: "#B54732",
    fontSize: 12,
    fontWeight: "700",
  },
  disabledButton: {
    opacity: 0.5,
  },
  emptyCard: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E2E8F0",
    borderRadius: 13,
    borderWidth: 1,
    padding: 18,
  },
  footer: {
    alignItems: "center",
    padding: 18,
  },
  loadMore: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderColor: "#CBD5E1",
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 4,
    padding: 13,
  },
  loadMoreText: {
    color: "#3159A5",
    fontSize: 14,
    fontWeight: "700",
  },
  endText: {
    color: "#8793A5",
    fontSize: 12,
    padding: 16,
    textAlign: "center",
  },
  errorCard: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E2E8F0",
    borderRadius: 15,
    borderWidth: 1,
    maxWidth: 460,
    padding: 22,
    width: "100%",
  },
  modalBackdrop: {
    alignItems: "center",
    backgroundColor: "rgba(15, 23, 42, 0.48)",
    flex: 1,
    justifyContent: "center",
    padding: 20,
  },
  formCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    maxWidth: 540,
    padding: 22,
    width: "100%",
  },
  formTitle: {
    color: "#17243A",
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 15,
  },
  fieldLabel: {
    color: "#43536B",
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 6,
    marginTop: 10,
  },
  formInput: {
    backgroundColor: "#FFFFFF",
    borderColor: "#CBD5E1",
    borderRadius: 9,
    borderWidth: 1,
    color: "#17243A",
    fontSize: 14,
    minHeight: 44,
    paddingHorizontal: 12,
  },
  descriptionInput: {
    minHeight: 82,
    paddingTop: 10,
    textAlignVertical: "top",
  },
  categoryOptions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
  },
  categoryOption: {
    backgroundColor: "#F1F5F9",
    borderColor: "#E2E8F0",
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  categoryOptionSelected: {
    backgroundColor: "#E7EEFA",
    borderColor: "#3159A5",
  },
  categoryOptionText: {
    color: "#334155",
    fontSize: 12,
  },
  formActions: {
    flexDirection: "row",
    gap: 10,
    justifyContent: "flex-end",
    marginTop: 20,
  },
  cancelButton: {
    alignItems: "center",
    borderColor: "#CBD5E1",
    borderRadius: 9,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 44,
    minWidth: 90,
    paddingHorizontal: 14,
  },
  cancelText: {
    color: "#43536B",
    fontSize: 14,
    fontWeight: "600",
  },
  confirmText: {
    color: "#64748B",
    fontSize: 14,
    lineHeight: 21,
  },
  dangerButton: {
    alignItems: "center",
    backgroundColor: "#B54732",
    borderRadius: 9,
    justifyContent: "center",
    minHeight: 44,
    minWidth: 90,
    paddingHorizontal: 14,
  },
});
