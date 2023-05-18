import { ref } from 'vue';
import downloadGroupGraph from './downloadGroupGraph';

/**
 * This view model is used to show direct neighbors of a node. It can be extended
 * to pull second layer neighbors as well and then perform layout on them.
 */
export default class FocusViewModel {
  constructor(repositoryName, groupId) {
    this.name = repositoryName;
    this.repos = ref([]);
    this.lngLat = ref(null);
    this.loading = ref(true);
    downloadGroupGraph(groupId).then(graph => {
      this.loading.value = false;
      let neighgbors = [];
      this.lngLat.value = graph.getNode(repositoryName)?.data.l;
      graph.forEachLinkedNode(repositoryName, (node, link) => {
        neighgbors.push({
          name: node.id,
          lngLat: node.data.l,
          isExternal: !!(link.data?.e)
        });
      });
      
      neighgbors.sort((a, b) => {
        if (a.isExternal && !b.isExternal) {
          return 1;
        } else if (!a.isExternal && b.isExternal) {
          return -1;
        } else {
          return 0;
        }
      });

      this.repos.value = neighgbors;
    });
  }
}